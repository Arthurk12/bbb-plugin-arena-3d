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

/** Smoothing of the remote players' walking speed (0 = none, 1 = frozen). */
export const SPEED_SMOOTHING = 0.8;

/** Slime damage is reported to the relay in batches of at least this much. */
export const ENV_DAMAGE_BATCH = 10;

/** When the local pose is worth sending to the relay. */
export const POSE_SEND = {
  /** Poses are rounded like the relay stores them (centimeters, 1/100 rad). */
  precision: 100,
  minMove: 0.02, // meters
  minTurn: 0.02, // radians
  /** An unchanged pose is still sent this often, so the relay knows we are here. */
  keepaliveMs: 1000,
};
