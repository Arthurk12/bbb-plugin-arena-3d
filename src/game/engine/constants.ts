/** Longer frames (a background tab coming back) are cut to this, seconds. */
export const MAX_FRAME_DT = 0.05;

export const CAMERA = {
  fov: 75,
  near: 0.05,
  far: 200,
  /** Eye height while dead, lying on the floor. */
  deadEyeHeight: 0.3,
  deadRoll: 0.6, // radians
};

/** Feet this far below a pickup's base or above it still grab it. */
export const PICKUP_REACH_HEIGHT = 1.5; // meters

export const PICKUP_SPIN = 2; // radians per second

/** Shotgun tracers drawn per shot; every pellet still counts. */
export const MAX_TRACERS_PER_SHOT = 3;

/** Damage that kills from full health, for falls out of the arena. */
export const LETHAL_DAMAGE = 1000;

/** Smoothing of the remote players' walking speed (0 = none, 1 = frozen). */
export const SPEED_SMOOTHING = 0.8;
