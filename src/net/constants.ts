import { NetTiming } from './types';

/**
 * Data channels reach other clients through a Hasura live query refetched every ~333 ms, so
 * sending faster than that only adds load; remote players are drawn far enough in the past to
 * always have two samples to blend.
 */
export const NET_TIMING: NetTiming = {
  minSendIntervalMs: 250,
  heartbeatMs: 8000,
  interpolationDelayMs: 600,
  staleAfterMs: 25000,
};

/** Smaller pose changes than these are not worth a send. */
export const SEND_THRESHOLD = {
  position: 0.03, // meters
  rotation: 0.03, // radians
};

/** Coordinates are rounded to centimeters (and radians to 1/100) to keep payloads small. */
export const STATE_PRECISION = 100;

/** Remote samples further apart than this are a teleport (respawn): no blending. */
export const SNAP_DISTANCE = 6; // meters

/** Samples kept per remote user; a few seconds at the send rate is plenty. */
export const MAX_SAMPLES = 12;

/** Hits stay in the shooter's entry this long, so every client's live query sees them. */
export const HIT_TTL_MS = 3000;

export const MAX_HITS = 16;

/** Positions outside this box are rejected as corrupt. */
export const MAX_COORDINATE = 1000; // meters

export const MAX_HEALTH = 100;

export const MAX_DAMAGE_PER_HIT = 200;

export const MAX_WEAPON_INDEX = 7;

export const MAX_USER_ID_LENGTH = 128;

export const MAX_KILLERS = 128;

/** Integers above this would reach akka-apps as java.lang.Long, which it rejects. */
export const MAX_COUNTER = 2 ** 31 - 1;
