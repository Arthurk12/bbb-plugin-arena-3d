// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { ServerMessage } from '../../src/protocol/types';
import { createRelayConnection } from '../../src/relay-client/connection';
import type {
  ConnectionStatus, RelayConnection, SocketLike,
} from '../../src/relay-client/types';
import { createRelayServer } from '../../relay/src/server';
import type { RelayServer } from '../../relay/src/types';

const HOST = '127.0.0.1';
const PATH = '/arena-relay';
const ROUND = 'r1';
const MEETING = 'm1';
const TEST_TIMEOUT_MS = 10000;

const silentLogger = { info() {}, warn() {}, error() {} };

const liveServers = new Set<RelayServer>();
const connections: RelayConnection[] = [];

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

const waitFor = async (predicate: () => boolean, timeoutMs = 3000) => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('timed out waiting for condition');
    // eslint-disable-next-line no-await-in-loop
    await sleep(20);
  }
};

/** Starts a relay and records the users it let join (`joined` is logged per connection). */
const startServer = async (port = 0) => {
  const joins: string[] = [];
  const logger = {
    info: (message: string, extra?: Record<string, unknown>) => {
      if (message === 'joined') joins.push(String(extra?.userId));
    },
    warn() {},
    error() {},
  };
  const server = createRelayServer({ host: HOST, port, logger: { ...silentLogger, ...logger } });
  liveServers.add(server);
  const boundPort = await server.listen();
  return { server, port: boundPort, joins };
};

interface Recorder {
  statuses: ConnectionStatus[];
  messages: ServerMessage[];
  onStatus: (status: ConnectionStatus) => void;
  onMessage: (message: ServerMessage) => void;
}

const recorder = (): Recorder => {
  const rec: Recorder = {
    statuses: [],
    messages: [],
    onStatus: (status) => rec.statuses.push(status),
    onMessage: (message) => rec.messages.push(message),
  };
  return rec;
};

const connectClient = (port: number, userId: string, rec: Recorder): RelayConnection => {
  const connection = createRelayConnection({
    url: `ws://${HOST}:${port}${PATH}`,
    sessionToken: 'test-token',
    round: ROUND,
    onMessage: rec.onMessage,
    onStatus: rec.onStatus,
    createSocket: (url) => new WebSocket(url, {
      headers: {
        'user-id': userId,
        'meeting-id': MEETING,
        'user-name': userId,
      },
    }) as unknown as SocketLike,
  });
  connections.push(connection);
  return connection;
};

const lastStatus = (rec: Recorder) => rec.statuses[rec.statuses.length - 1];

afterEach(async () => {
  connections.splice(0).forEach((connection) => connection.close());
  await Promise.all([...liveServers].map((server) => server.close()));
  liveServers.clear();
});

describe('relay connection', () => {
  it('connects, gets a welcome and estimates the relay clock', async () => {
    const { port } = await startServer();
    const rec = recorder();
    const connection = connectClient(port, 'u1', rec);

    expect(rec.statuses).toEqual(['connecting']);
    await waitFor(() => rec.statuses.includes('open'));
    expect(rec.statuses).toEqual(['connecting', 'open']);
    await waitFor(() => rec.messages.some((message) => message.type === 'welcome'));

    await sleep(1200);
    expect(connection.clock.relayNow(performance.now())).not.toBeNull();
    expect(connection.clock.rtt()).toBeLessThan(50);
  }, TEST_TIMEOUT_MS);

  it('delivers a pose from one client in a snapshot to another', async () => {
    const { port } = await startServer();
    const recA = recorder();
    const recB = recorder();
    const clientA = connectClient(port, 'ua', recA);
    connectClient(port, 'ub', recB);
    await waitFor(() => recA.statuses.includes('open'));
    await waitFor(() => recB.statuses.includes('open'));

    // The relay spawns each player itself and refuses a pose far from where it is, so the
    // test moves a short step from the spawn point it reports.
    const entryOf = (rec: Recorder, userId: string) => {
      let found: number[] | null = null;
      rec.messages.forEach((message) => {
        if (message.type !== 'snap') return;
        message.players.forEach((player) => {
          if (player[0] === userId) found = player.slice(1, 4);
        });
      });
      return found as number[] | null;
    };
    await waitFor(() => entryOf(recB, 'ua') !== null);
    const [x, y, z] = entryOf(recB, 'ua') as number[];

    clientA.send({ type: 'pose', p: [x + 0.5, y, z], y: 0.5, x: 0, w: 0, on: true });

    await waitFor(() => {
      const moved = entryOf(recB, 'ua');
      return moved !== null && Math.abs(moved[0] - (x + 0.5)) < 0.02;
    });
  }, TEST_TIMEOUT_MS);

  it('marks the first connection failed when the same user connects again', async () => {
    const { port, joins } = await startServer();
    const first = recorder();
    connectClient(port, 'u1', first);
    await waitFor(() => first.statuses.includes('open'));

    const second = recorder();
    const secondConnection = connectClient(port, 'u1', second);
    await waitFor(() => lastStatus(first) === 'failed');

    await sleep(1500);
    expect(lastStatus(first)).toBe('failed');
    expect(joins).toHaveLength(2);
    expect(secondConnection.status()).toBe('open');
  }, TEST_TIMEOUT_MS);

  it('reconnects after the server goes away and comes back on the same port', async () => {
    const first = await startServer();
    const rec = recorder();
    connectClient(first.port, 'u1', rec);
    await waitFor(() => rec.messages.some((message) => message.type === 'welcome'));

    await first.server.close();
    liveServers.delete(first.server);
    await waitFor(() => lastStatus(rec) === 'connecting');

    await startServer(first.port);
    await waitFor(() => lastStatus(rec) === 'open', 3000);
    await waitFor(
      () => rec.messages.filter((message) => message.type === 'welcome').length === 2,
      3000,
    );
  }, TEST_TIMEOUT_MS);

  it('closes for good on close() and does not reconnect', async () => {
    const { port, joins } = await startServer();
    const rec = recorder();
    const connection = connectClient(port, 'u1', rec);
    await waitFor(() => rec.statuses.includes('open'));

    connection.close();
    await waitFor(() => lastStatus(rec) === 'closed');

    await sleep(1500);
    expect(connection.status()).toBe('closed');
    expect(joins).toHaveLength(1);
  }, TEST_TIMEOUT_MS);
});
