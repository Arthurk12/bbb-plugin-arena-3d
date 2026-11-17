import http from 'http';
import { AddressInfo } from 'net';
import { WebSocket, WebSocketServer } from 'ws';
import {
  CLIENT_MESSAGE, CLOSE_CODES, PROTOCOL_VERSION, RELAY_LIMITS, RELAY_TIMING,
} from '../../src/protocol/constants';
import {
  HEALTH_PATH, HELLO_TIMEOUT_MS, ROOM_SWEEP_INTERVAL_MS, RELAY_PATHS, RTT_PING_INTERVAL_MS,
} from './constants';
import { readIdentity } from './identity';
import { parseClientMessage } from './validation';
import { createRateLimiter } from './limits';
import { createRoomRegistry } from './registry';
import {
  Identity, Room, RoomClient, RelayServer, RelayServerOptions,
} from './types';

/**
 * The relay is a plain HTTP server with WebSocket upgrades: nginx terminates TLS and checks the
 * BBB session, the relay only sees loopback traffic and trusts the identity headers it sets.
 */
export const createRelayServer = ({
  host,
  port,
  logger,
  clock = () => performance.now(),
}: RelayServerOptions): RelayServer => {
  const registry = createRoomRegistry(clock);

  const server = http.createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://relay').pathname;
    if (req.method === 'GET' && path === HEALTH_PATH) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: RELAY_LIMITS.maxMessageBytes,
  });

  const onConnection = (ws: WebSocket, identity: Identity) => {
    const { userId, meetingId } = identity;
    const limiter = createRateLimiter(
      RELAY_LIMITS.maxMessagesPerSecond,
      RELAY_LIMITS.abuseGraceMs,
    );
    let rtt = 0;
    let pingSentAt = 0;
    let room: Room | null = null;

    const client: RoomClient = {
      userId,
      name: identity.name,
      send: (message) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      },
      rttMs: () => rtt,
      close: (code, reason) => ws.close(code, reason),
    };

    const ping = () => {
      pingSentAt = clock();
      ws.ping();
    };
    ping();
    const pingTimer = setInterval(ping, RTT_PING_INTERVAL_MS);
    ws.on('pong', () => {
      rtt = clock() - pingSentAt;
    });

    // A socket that never says hello holds no room, so it is not worth keeping open.
    const helloTimer = setTimeout(
      () => ws.close(CLOSE_CODES.BAD_HELLO, 'hello timeout'),
      HELLO_TIMEOUT_MS,
    );

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        return;
      }
      const now = clock();
      if (!limiter.allow(now)) {
        if (limiter.abusive(now)) {
          ws.close(CLOSE_CODES.RATE_LIMITED, 'rate limit');
        }
        return;
      }

      const message = parseClientMessage(data.toString());
      if (message === null) {
        return;
      }

      if (room === null) {
        if (message.type !== CLIENT_MESSAGE.HELLO) {
          return;
        }
        if (message.v !== PROTOCOL_VERSION) {
          ws.close(CLOSE_CODES.BAD_VERSION, 'protocol version');
          return;
        }
        clearTimeout(helloTimer);
        room = registry.get(meetingId, message.round);
        room.join(client);
        logger.info('joined', { meetingId, userId, round: message.round });
        return;
      }

      room.handle(userId, message);
    });

    ws.on('close', () => {
      clearInterval(pingTimer);
      clearTimeout(helloTimer);
      room?.leave(userId, client);
      logger.info('left', { meetingId, userId });
    });

    ws.on('error', (error) => {
      logger.warn('socket error', { userId, error: String(error) });
    });
  };

  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url ?? '/', 'http://relay').pathname;
    if (!RELAY_PATHS.includes(path)) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    const identity = readIdentity(req.headers);
    if (identity === null) {
      logger.warn('upgrade without identity');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, identity));
  });

  let snapshotTimer: NodeJS.Timeout | null = null;
  let sweepTimer: NodeJS.Timeout | null = null;

  return {
    listen: () => new Promise((resolve, reject) => {
      snapshotTimer = setInterval(() => registry.tickAll(), RELAY_TIMING.snapshotIntervalMs);
      sweepTimer = setInterval(() => registry.sweep(), ROOM_SWEEP_INTERVAL_MS);
      server.once('error', reject);
      server.listen(port, host, () => {
        resolve((server.address() as AddressInfo).port);
      });
    }),
    close: () => new Promise((resolve) => {
      if (snapshotTimer !== null) clearInterval(snapshotTimer);
      if (sweepTimer !== null) clearInterval(sweepTimer);
      wss.clients.forEach((ws) => ws.close(CLOSE_CODES.SHUTDOWN, 'shutdown'));
      wss.close();
      server.close(() => resolve());
    }),
  };
};
