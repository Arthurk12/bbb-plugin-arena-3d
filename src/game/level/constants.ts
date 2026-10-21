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
