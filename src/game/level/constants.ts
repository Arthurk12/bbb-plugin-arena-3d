import { MaterialId } from './types';

/** Meters covered by one repeat of a texture. */
export const TEXTURE_WORLD_SIZE = 2;

/** Texture side, pixels: small on purpose, drawn with nearest filtering for the retro look. */
export const TEXTURE_SIZE = 64;

export const SKY_COLOR = 0x2a1b3d;

export const FOG = { near: 35, far: 120 };

export const LIGHTS = {
  hemisphereSky: 0xc9b8ff,
  hemisphereGround: 0x4a3420,
  hemisphereIntensity: 1.1,
  sunColor: 0xffd2a1,
  sunIntensity: 1.6,
  sunPosition: [30, 60, 20] as [number, number, number],
};

export const PICKUP_COLOR = 0x3dff7a;

/** Materials drawn with a plain glowing color instead of a texture. */
export const GLOW_COLORS: Partial<Record<MaterialId, number>> = {
  slime: 0x5dff3a,
  neonPink: 0xff3fd2,
  neonCyan: 0x3ff6ff,
};

export const SLIME_OPACITY = 0.8;

/** Baked darkening at the foot of every wall and box: the level's contact shadows. */
export const AMBIENT_OCCLUSION = {
  /** Brightness at the very bottom of a side face. */
  base: 0.55,
  /** Height over which the darkening fades out, meters. */
  height: 1.4,
  /** Side faces are cut every this many meters, so the fade has vertices to live on. */
  segment: 0.7,
  /** Brightness of bottom faces (overhangs). */
  bottom: 0.7,
};

/** The sky dome: a gradient, twinkling stars and a distant skyline with lit windows. */
export const SKY = {
  radius: 150, // meters, inside the camera's far plane
  widthSegments: 32,
  heightSegments: 16,
  zenith: 0x120a24,
  horizon: 0x4a2c5e,
  skyline: 0x0b0714,
  window: 0xffc861,
  /** Skyline blocks around the horizon. */
  buildings: 28,
  /** Range of the skyline's tops (sine of the elevation), so it shows above the yard's walls. */
  skylineMin: 0.2,
  skylineMax: 0.36,
  starThreshold: 0.99,
  starGrid: 160,
  windowGrid: [260, 140] as [number, number],
  windowThreshold: 0.82,
};

/** Cheap per-frame animation of the level: a uniform or a texture offset each. */
export const LEVEL_ANIMATION = {
  neonPulsePerMs: 0.003,
  /** How much the neon dims at the bottom of its pulse. */
  neonDepth: 0.25,
  padScrollPerMs: 0.0006,
  slimeScrollPerMs: 0.00004,
  pickupBobPerMs: 0.003,
  pickupBobHeight: 0.12, // meters
  pickupSpinPerMs: 0.002,
};

export const PICKUP_GLOW = {
  size: 1.6, // meters
  textureSize: 64,
};
