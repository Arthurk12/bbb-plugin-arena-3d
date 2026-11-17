import { CLIENT_MESSAGE, PROTOCOL_VERSION, RELAY_TIMING, SERVER_MESSAGE } from '../protocol/constants';
import { ClientMessage, PongMessage, ServerMessage } from '../protocol/types';
import {
  FAILED_AFTER_ATTEMPTS, NORMAL_CLOSE, PING_BURST, RECONNECT_DELAYS_MS, SOCKET_OPEN,
  TERMINAL_CLOSE_CODES,
} from './constants';
import { createRelayClock } from './clock';
import {
  ConnectionStatus, RelayConnection, RelayConnectionOptions, SocketLike,
} from './types';
import { withSessionToken } from './url';

type Timer = ReturnType<typeof setTimeout>;

const defaultCreateSocket = (url: string): SocketLike => (
  new WebSocket(url) as unknown as SocketLike
);

const defaultNow = (): number => performance.now();

const isMessage = (value: unknown): value is ServerMessage => (
  typeof value === 'object'
  && value !== null
  && typeof (value as { type?: unknown }).type === 'string'
);

/**
 * One connection to the relay that keeps itself alive: it reconnects after drops, pings to keep
 * the clock estimate, and stops retrying when the relay says a retry cannot work.
 */
export const createRelayConnection = (options: RelayConnectionOptions): RelayConnection => {
  const {
    url,
    sessionToken,
    round,
    onMessage,
    onStatus,
    createSocket = defaultCreateSocket,
    now = defaultNow,
  } = options;

  const clock = createRelayClock();
  let socket: SocketLike | null = null;
  // Not a real status yet: the first `connect()` below reports `connecting`.
  let status: ConnectionStatus = 'closed';
  /** Attempts in a row without opening. */
  let attempts = 0;
  let closedByUs = false;
  let reconnectTimer: Timer | null = null;
  let burstTimers: Timer[] = [];
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const setStatus = (next: ConnectionStatus) => {
    if (next === status) return;
    status = next;
    onStatus(next);
  };

  const send = (message: ClientMessage) => {
    if (socket && socket.readyState === SOCKET_OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  const ping = () => {
    send({ type: CLIENT_MESSAGE.PING, c: now() });
  };

  const clearPingTimers = () => {
    burstTimers.forEach((timer) => clearTimeout(timer));
    burstTimers = [];
    if (pingTimer !== null) clearInterval(pingTimer);
    pingTimer = null;
  };

  const connect = () => {
    reconnectTimer = null;
    setStatus(attempts >= FAILED_AFTER_ATTEMPTS ? 'failed' : 'connecting');
    clock.reset();

    const current = createSocket(withSessionToken(url, sessionToken));
    socket = current;
    // Events from a socket we already gave up on are ignored.
    const isCurrent = () => socket === current;

    current.onopen = () => {
      if (!isCurrent()) return;
      attempts = 0;
      setStatus('open');
      send({ type: CLIENT_MESSAGE.HELLO, v: PROTOCOL_VERSION, round });
      ping();
      for (let i = 1; i < PING_BURST.count; i += 1) {
        burstTimers.push(setTimeout(ping, PING_BURST.intervalMs * i));
      }
      pingTimer = setInterval(ping, RELAY_TIMING.pingIntervalMs);
    };

    current.onmessage = (event) => {
      if (!isCurrent() || typeof event.data !== 'string') return;
      let message: unknown;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!isMessage(message)) return;
      if (message.type === SERVER_MESSAGE.PONG) {
        const pong = message as PongMessage;
        clock.onPong(pong.c, pong.s, now());
      }
      onMessage(message);
    };

    current.onclose = (event) => {
      if (!isCurrent()) return;
      socket = null;
      clearPingTimers();
      if (closedByUs) {
        setStatus('closed');
        return;
      }
      if (TERMINAL_CLOSE_CODES.includes(event.code)) {
        setStatus('failed');
        return;
      }
      attempts += 1;
      setStatus(attempts >= FAILED_AFTER_ATTEMPTS ? 'failed' : 'connecting');
      const delay = RECONNECT_DELAYS_MS[
        Math.min(attempts - 1, RECONNECT_DELAYS_MS.length - 1)
      ];
      reconnectTimer = setTimeout(connect, delay);
    };

    // A close always follows an error, so the close handler does the work. Setting a listener
    // matters for the `ws` package, which throws on an error nobody listens to.
    current.onerror = () => {};
  };

  const close = () => {
    closedByUs = true;
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    clearPingTimers();
    if (socket) {
      socket.close(NORMAL_CLOSE);
    } else {
      setStatus('closed');
    }
  };

  connect();

  return {
    send,
    clock,
    status: () => status,
    close,
  };
};
