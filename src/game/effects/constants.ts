/** Tracers: thin glowing beams, pooled; the oldest is reused when all are busy. */
export const TRACERS = {
  capacity: 48,
  lifetimeMs: 110,
  thickness: 0.035, // meters
};

/** Impact particles: a small burst per hit, pooled, falling under gravity. */
export const PARTICLES = {
  capacity: 192,
  perImpact: 6,
  speed: 3.5, // m/s
  gravity: 9, // m/s²
  lifetimeMs: 320,
  size: 0.12, // meters
  textureSize: 32,
};

/** Bullet marks on walls, pooled: they fade out by shrinking at the end of their life. */
export const DECALS = {
  capacity: 48,
  size: 0.16, // meters
  lifetimeMs: 12000,
  fadeMs: 2000,
  /** Off the wall, so the mark never flickers into it. */
  offset: 0.01, // meters
  opacity: 0.65,
  /** How close to a block's face an impact must be to leave a mark there. */
  surfaceTolerance: 0.03, // meters
};

export const SPARK_COLORS = {
  wall: 0xffd27a,
  player: 0xff3030,
};

/** Tracers start this far ahead of the eye, roughly at the gun. */
export const MUZZLE_OFFSET = { right: 0.22, down: 0.18, forward: 0.6 };

/** Remote shots draw a tracer this long along their aim (we don't know what they hit). */
export const REMOTE_TRACER_RANGE = 40; // meters

/** Sounds from farther than this are silent. */
export const HEARING_DISTANCE = 60; // meters

export const MASTER_VOLUME = 0.35;
