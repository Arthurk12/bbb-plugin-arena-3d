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
  visor: [0.38, 0.08, 0.05] as [number, number, number],
  nameTagHeight: 2.2,
};

/** Extra pieces drawn on the avatar, meters; the proportions above stay those of the hitbox. */
export const AVATAR_DETAIL = {
  boot: [0.26, 0.16, 0.3] as [number, number, number],
  /** Boots stick out a little in front. */
  bootForward: 0.03,
  belt: [0.63, 0.08, 0.35] as [number, number, number],
  backpack: [0.42, 0.42, 0.16] as [number, number, number],
  shoulderPad: [0.22, 0.1, 0.34] as [number, number, number],
  /** How much wider than the head the helmet is. */
  helmetExtra: 0.05,
  helmetHeight: 0.18,
  /** Helmet top above the head's top. */
  helmetRise: 0.04,
  stripeHeight: 0.05,
  hand: [0.16, 0.12, 0.18] as [number, number, number],
};

/** Pieces drawn in `cloth` take the player's color; the others keep their own. */
export const AVATAR_COLORS = {
  cloth: 0xffffff,
  legs: 0x2b2f3a,
  boots: 0x1b1d22,
  belt: 0x3a2c1c,
  backpack: 0x55593f,
  skin: 0xe0ac7e,
  helmet: 0x3d4450,
  visor: 0x39e6ff,
  flash: 0xfff1a8,
};

/** Shoulder rotation that points a hanging arm straight ahead. */
export const ARM_AIM = Math.PI / 2;

/** Dead players lie on their back. */
export const DEATH_TILT = Math.PI / 2;

export const FLASH_SIZE = 0.35; // meters

/** Instances reserved per body part: the maxPlayers setting's upper bound. */
export const CROWD_CAPACITY = 64;

/** Blob shadow under each player. */
export const SHADOW = {
  size: 0.9, // meters
  opacity: 0.45,
  /** Height above the feet, to stay clear of the floor. */
  lift: 0.02,
  textureSize: 64,
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
  font: 'bold 28px sans-serif',
  maxChars: 18,
  scale: [1.2, 0.3] as [number, number],
  background: 'rgba(0, 0, 0, 0.4)',
  text: '#ffffff',
  border: 2,
  /** Farther than this, tags are hidden: they only cluttered the view. */
  maxDistance: 35, // meters
};

export const REMOTE_FLASH_MS = 70;

/** Saturation and lightness of the per-user color (hue comes from the user id). */
export const USER_COLOR_SL = [0.65, 0.5] as [number, number];
