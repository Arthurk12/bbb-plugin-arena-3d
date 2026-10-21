/** Remote player body as drawn and as hit, meters (feet at 0, facing -z). */
export const AVATAR = {
  hipHeight: 0.8,
  shoulderHeight: 1.4,
  neckHeight: 1.45,
  headSize: 0.36,
  torso: [0.6, 0.65, 0.32] as [number, number, number],
  leg: [0.22, 0.8, 0.24] as [number, number, number],
  legOffsetX: 0.13,
  arm: [0.18, 0.6, 0.2] as [number, number, number],
  armOffsetX: 0.4,
  gun: [0.1, 0.12, 0.5] as [number, number, number],
  visor: [0.38, 0.08, 0.05] as [number, number, number],
  nameTagHeight: 2.2,
};

export const HITBOX = {
  bodyHalfWidth: 0.35,
  bodyHeight: 1.45,
  headHalfWidth: 0.22,
  headHeight: 0.42,
};

export const AVATAR_COLORS = {
  legs: 0x2b2f3a,
  skin: 0xe0ac7e,
  hair: 0xf2c94c,
  visor: 0x0a0a0a,
  gun: 0x30343c,
  flash: 0xfff1a8,
};

export const LEG_SWING = {
  /** Radians of leg swing at full run. */
  amplitude: 0.7,
  /** Swing cycles per meter walked. */
  frequency: 0.7,
  /** Speed (m/s) at which the swing is widest. */
  fullSpeed: 8,
};

export const NAME_TAG = {
  canvasWidth: 256,
  canvasHeight: 64,
  font: 'bold 30px sans-serif',
  maxChars: 18,
  scale: [1.6, 0.4] as [number, number],
};

export const REMOTE_FLASH_MS = 70;

/** Saturation and lightness of the per-user torso color (hue comes from the user id). */
export const USER_COLOR_SL = [0.65, 0.5] as [number, number];
