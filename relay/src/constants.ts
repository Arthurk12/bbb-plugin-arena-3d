export const RELAY_DEFAULTS = {
  host: '127.0.0.1',
  port: 8099,
};

/** Paths the upgrade is accepted on: nginx may forward with or without its location prefix. */
export const RELAY_PATHS = ['/', '/arena-relay'];

export const HEALTH_PATH = '/healthz';

/** Set by nginx from bbb-web's checkAuthorization (lower case, as Node exposes them). */
export const IDENTITY_HEADERS = {
  USER_ID: 'user-id',
  MEETING_ID: 'meeting-id',
  USER_NAME: 'user-name',
};

/** Snapshot ticks kept per player for rewinding (~1.6 s at 20 Hz). */
export const HISTORY_LENGTH = 32;

/** A connection must say hello this soon. */
export const HELLO_TIMEOUT_MS = 5000;

/** The relay pings each socket this often to measure its RTT. */
export const RTT_PING_INTERVAL_MS = 2000;

/** Empty rooms are looked for this often. */
export const ROOM_SWEEP_INTERVAL_MS = 60 * 1000;

/** Fastest a player can legitimately move: falls (40 m/s) plus running, with margin. */
export const MAX_PLAYER_SPEED = 45; // m/s

/** Extra distance tolerated between two poses (jitter, rounding), meters. */
export const TELEPORT_SLACK = 1;

/** Shots may arrive this much closer than the weapon's cooldown (network jitter). */
export const SHOT_COOLDOWN_TOLERANCE = 0.8;

/** Largest heal a client may report at once (the biggest health kit). */
export const MAX_HEAL = 50;

/** Longest `cause` accepted in an `env` message. */
export const MAX_CAUSE_LENGTH = 16;

/** Poses are rounded to centimeters (and radians to 1/100), like the data-channel payloads. */
export const POSE_PRECISION = 100;

/** A socket that went over its rate is out of trouble only once half its bucket refilled. */
export const RATE_RECOVERY_SHARE = 0.5;

/** Extra reach when a player takes an ammo box: the relay's view of them lags a little. */
export const PICKUP_SLACK = 1; // meters
