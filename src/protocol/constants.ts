/** Bumped on any incompatible change; the relay refuses other versions. */
export const PROTOCOL_VERSION = 2;

/** Timing shared by the relay and the client, ms. */
export const RELAY_TIMING = {
  /** The relay sends a snapshot this often (20 Hz). */
  snapshotIntervalMs: 50,
  /** Every player is in a snapshot at least this often, moving or not. */
  fullSnapshotIntervalMs: 1000,
  /** Clients draw remote players this far behind the relay's clock. */
  interpolationDelayMs: 100,
  /** Shots are never resolved further in the past than this (favor the shooter, up to here). */
  maxRewindMs: 200,
  /** A shot's view time is trusted only this close to what the measured RTT predicts. */
  viewTimeToleranceMs: 100,
  /** Clients ping this often to keep their estimate of the relay's clock. */
  pingIntervalMs: 2000,
  /** A reload may finish this much before its time when a shot or a pose asks (network). */
  reloadToleranceMs: 100,
};

export const RELAY_LIMITS = {
  /** Bigger frames are refused by the socket. */
  maxMessageBytes: 2048,
  /** Messages a socket may send per second (token bucket of this size). */
  maxMessagesPerSecond: 60,
  /** Staying over the rate this long closes the socket. */
  abuseGraceMs: 5000,
  /** Players beyond this join as spectators. */
  maxPlayersPerRoom: 16,
  /** A shot must leave from this close to the shooter's eye, meters. */
  maxShotOriginOffset: 1.5,
  /** Rooms with nobody connected are dropped after this long. */
  emptyRoomTtlMs: 10 * 60 * 1000,
};

/** Round ids are short random strings (see `newRoundId`). */
export const ROUND_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const CLIENT_MESSAGE = {
  HELLO: 'hello',
  POSE: 'pose',
  SHOT: 'shot',
  ENV: 'env',
  PING: 'ping',
  RELOAD: 'reload',
  PICKUP: 'pickup',
} as const;

export const SERVER_MESSAGE = {
  WELCOME: 'welcome',
  SNAPSHOT: 'snap',
  SHOT: 'shot',
  HIT: 'hit',
  HEALTH: 'health',
  KILL: 'kill',
  SPAWN: 'spawn',
  SCORES: 'scores',
  JOIN: 'join',
  LEAVE: 'leave',
  PONG: 'pong',
  REJECT: 'reject',
  AMMO: 'ammo',
} as const;

/** WebSocket close codes the relay uses (4000–4999 are free for applications). */
export const CLOSE_CODES = {
  BAD_HELLO: 4400,
  UNAUTHORIZED: 4401,
  REPLACED: 4409,
  RATE_LIMITED: 4429,
  BAD_VERSION: 4426,
  SHUTDOWN: 1001,
};

/** Bits of a snapshot entry's flags. */
export const SNAPSHOT_FLAGS = {
  ALIVE: 1,
  IN_ARENA: 2,
};

export const ENV_KIND = {
  DAMAGE: 'damage',
  HEAL: 'heal',
} as const;

/** Weapon index sent in a `kill` caused by the level (falls, slime). */
export const ENVIRONMENT_WEAPON = -1;

/** Zone index sent in a `hit` or `kill` the level caused (falls, slime). */
export const ENVIRONMENT_ZONE = -1;

/** Why the relay sent a player their ammo. */
export const AMMO_UPDATE = {
  /** Spawning (or joining): everything, as it is now. */
  SPAWN: 'spawn',
  /** A reload finished. */
  RELOAD: 'reload',
  /** An ammo box was taken: only the reserves changed. */
  PICKUP: 'pickup',
  /** A shot or a reload was refused: everything, to correct the client's count. */
  SYNC: 'sync',
} as const;
