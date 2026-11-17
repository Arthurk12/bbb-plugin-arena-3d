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

/** Hits we land on arms and legs sound softer than on the body. */
export const LIMB_HIT_VOLUME = 0.6;

/** Past this much zoom (0 to 1) the gun leaves the view and the scope's lens fills the screen. */
export const SCOPE_LENS_AT = 0.5;

/** The empty gun's click repeats at most this often while the trigger is held. */
export const EMPTY_CLICK_MS = 400;
