export const TRACER_LIFETIME_MS = 90;

export const SPARK_LIFETIME_MS = 220;

export const SPARK_SIZE = 0.18; // meters

export const SPARK_COLORS = {
  wall: 0xffe08a,
  player: 0xff2a2a,
};

/** Tracers start this far ahead of the eye, roughly at the gun. */
export const MUZZLE_OFFSET = { right: 0.22, down: 0.18, forward: 0.6 };

/** Remote shots draw a tracer this long along their aim (we don't know what they hit). */
export const REMOTE_TRACER_RANGE = 40; // meters

/** Sounds from farther than this are silent. */
export const HEARING_DISTANCE = 60; // meters

export const MASTER_VOLUME = 0.35;
