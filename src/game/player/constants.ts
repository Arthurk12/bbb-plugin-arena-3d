/** Player body and movement tuning: meters, seconds. */
export const PLAYER = {
  halfWidth: 0.3,
  height: 1.7,
  eyeHeight: 1.55,
  gravity: 22,
  jumpSpeed: 8,
  runSpeed: 8,
  walkSpeed: 4,
  /** How fast velocity reaches the wished one, 1/s. */
  groundAccel: 12,
  airAccel: 2.5,
  /** Ledges up to this high are climbed without jumping (stairs). */
  stepHeight: 0.55,
  maxFallSpeed: 40,
  /** Physics never advances more than this per step, so fast falls don't tunnel. */
  maxSubstep: 1 / 120,
};

/** Feet this close above a surface count as standing on it. */
export const GROUND_EPSILON = 0.02;
