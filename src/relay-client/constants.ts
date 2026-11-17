import { CLOSE_CODES } from '../protocol/constants';

/** Path of the relay behind nginx, on the BBB server that serves the plugin. */
export const RELAY_DEFAULT_PATH = '/arena-relay';

/** Query parameter bbb-web's checkAuthorization reads the session token from. */
export const SESSION_TOKEN_PARAM = 'sessionToken';

/** Waits before each reconnection attempt, ms; the last one repeats. */
export const RECONNECT_DELAYS_MS = [1000, 2000, 5000];

/** After this many attempts in a row without opening, the status turns to `failed` (retries go on). */
export const FAILED_AFTER_ATTEMPTS = 3;

/** Closes that a retry cannot fix: refused session, replaced by another tab, wrong version. */
export const TERMINAL_CLOSE_CODES = [
  CLOSE_CODES.UNAUTHORIZED, CLOSE_CODES.REPLACED, CLOSE_CODES.BAD_VERSION,
];

/** A few quick pings right after connecting, so the clock estimate is good from the start. */
export const PING_BURST = { count: 5, intervalMs: 200 };

/** Pong samples kept for the clock estimate (the lowest RTT one wins). */
export const CLOCK_SAMPLES = 8;

/** Snapshots kept per remote player (1.5 s at 20 Hz). */
export const SNAPSHOT_BUFFER_LENGTH = 30;

/** Remote samples further apart than this are a teleport (respawn): no blending. */
export const SNAP_DISTANCE = 6; // meters

/** `WebSocket.OPEN`, without depending on a global WebSocket in tests. */
export const SOCKET_OPEN = 1;

/** Normal close, sent when the arena closes the connection on purpose. */
export const NORMAL_CLOSE = 1000;
