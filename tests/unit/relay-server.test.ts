// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { CLOSE_CODES, PROTOCOL_VERSION } from '../../src/protocol/constants';
import { createRelayServer } from '../../relay/src/server';
import type { RelayServer } from '../../relay/src/types';

type Message = { type: string; [key: string]: unknown };

interface TestClient {
  ws: WebSocket;
  /** Resolves with the next message of `type`, from the inbox or the next one to arrive. */
  next: (type: string, timeoutMs?: number) => Promise<Message>;
}

const silentLogger = { info() {}, warn() {}, error() {} };

const IDENTITY_HEADERS = {
  'user-id': 'u1',
  'meeting-id': 'm1',
  'user-name': 'Ana%20Maria',
};

const openSockets: WebSocket[] = [];

const connect = (port: number, path: string, headers: Record<string, string>): TestClient => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`, { headers });
  openSockets.push(ws);

  const inbox: Message[] = [];
  const waiters: Array<{ type: string; resolve: (message: Message) => void }> = [];
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString()) as Message;
    const index = waiters.findIndex((waiter) => waiter.type === message.type);
    if (index >= 0) {
      waiters.splice(index, 1)[0].resolve(message);
    } else {
      inbox.push(message);
    }
  });

  const next = (type: string, timeoutMs = 1000) => {
    const index = inbox.findIndex((message) => message.type === type);
    if (index >= 0) {
      return Promise.resolve(inbox.splice(index, 1)[0]);
    }
    return new Promise<Message>((resolve, reject) => {
      const waiter = {
        type,
        resolve: (message: Message) => {
          clearTimeout(timer);
          resolve(message);
        },
      };
      const timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error(`timed out waiting for "${type}"`));
      }, timeoutMs);
      waiters.push(waiter);
    });
  };

  return { ws, next };
};

const opened = (ws: WebSocket) => new Promise<void>((resolve, reject) => {
  ws.once('open', () => resolve());
  ws.once('error', reject);
});

const closed = (ws: WebSocket) => new Promise<number>((resolve) => {
  ws.once('close', (code) => resolve(code));
});

/** Connects as a player and says hello, returning the client once the welcome arrived. */
const joinRoom = async (port: number, userId: string, round: string) => {
  const client = connect(port, '/', { ...IDENTITY_HEADERS, 'user-id': userId });
  await opened(client.ws);
  client.ws.send(JSON.stringify({ type: 'hello', v: PROTOCOL_VERSION, round }));
  const welcome = await client.next('welcome');
  return { client, welcome };
};

describe('relay server', () => {
  let server: RelayServer;
  let port: number;

  beforeEach(async () => {
    server = createRelayServer({ host: '127.0.0.1', port: 0, logger: silentLogger });
    port = await server.listen();
  });

  afterEach(async () => {
    // Refused upgrades are already gone; only sockets that are still open need closing.
    const pending = openSockets.splice(0)
      .filter((ws) => ws.readyState === WebSocket.OPEN)
      .map((ws) => {
        const done = closed(ws);
        ws.terminate();
        return done;
      });
    await Promise.all(pending);
    await server.close();
  });

  it('answers GET /healthz with ok', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });

  it('refuses an upgrade without identity headers', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    openSockets.push(ws);
    const response = await new Promise<{ status: number }>((resolve, reject) => {
      ws.once('unexpected-response', (_req, res) => resolve({ status: res.statusCode ?? 0 }));
      ws.once('open', () => reject(new Error('unexpected open')));
    });
    expect(response.status).toBe(401);
  });

  it('refuses an upgrade on an unknown path', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/other`, { headers: IDENTITY_HEADERS });
    openSockets.push(ws);
    const response = await new Promise<{ status: number }>((resolve, reject) => {
      ws.once('unexpected-response', (_req, res) => resolve({ status: res.statusCode ?? 0 }));
      ws.once('open', () => reject(new Error('unexpected open')));
    });
    expect(response.status).toBe(404);
  });

  it('welcomes a player after hello, with the decoded name', async () => {
    const { welcome } = await joinRoom(port, 'u1', 'r1');
    expect(welcome.you).toBe('u1');
    const self = (welcome.players as Array<{ id: string; name: string }>)
      .find((player) => player.id === 'u1');
    expect(self?.name).toBe('Ana Maria');
  });

  it('tells the first player about a second one, and sends snapshots', async () => {
    const first = await joinRoom(port, 'u1', 'r1');
    const second = await joinRoom(port, 'u2', 'r1');
    expect(second.welcome.you).toBe('u2');

    const join = await first.client.next('join');
    expect(join.id).toBe('u2');

    const snap = await first.client.next('snap', 500);
    expect(snap.type).toBe('snap');
  });

  it('closes a socket that says hello with a wrong protocol version', async () => {
    const client = connect(port, '/', IDENTITY_HEADERS);
    await opened(client.ws);
    const code = closed(client.ws);
    client.ws.send(JSON.stringify({ type: 'hello', v: 999, round: 'r1' }));
    expect(await code).toBe(CLOSE_CODES.BAD_VERSION);
  });

  it('tells the first player when the second one leaves', async () => {
    const first = await joinRoom(port, 'u1', 'r1');
    const second = await joinRoom(port, 'u2', 'r1');
    await first.client.next('join');

    second.client.ws.close();
    const leave = await first.client.next('leave');
    expect(leave.id).toBe('u2');
  });
});
