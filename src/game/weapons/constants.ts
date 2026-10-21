import { WeaponDefinition, WeaponId } from './types';

export const WEAPON_IDS = ['blaster', 'shotgun'] as const;

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  blaster: {
    id: 'blaster',
    cooldownMs: 320,
    pellets: 1,
    spread: 0.004,
    damage: 22,
    range: 150,
    headMultiplier: 2,
    recoil: 0.012,
    tracerColor: 0xffd34d,
  },
  shotgun: {
    id: 'shotgun',
    cooldownMs: 950,
    pellets: 9,
    spread: 0.07,
    damage: 9,
    range: 60,
    headMultiplier: 1.5,
    recoil: 0.05,
    tracerColor: 0xff8a3d,
  },
};

export const DEFAULT_WEAPON: WeaponId = 'blaster';

export const VIEW_MODEL = {
  /** Gun position relative to the camera, meters. */
  rest: [0.2, -0.2, -0.5] as [number, number, number],
  scale: 0.6,
  bobFrequency: 1.6, // radians per meter
  bobAmplitude: 0.025, // meters
  bobFullSpeed: 8, // m/s
  kickRecovery: 6, // per second
  kickDistance: 0.08, // meters
  kickAngle: 0.25, // radians
  flashMs: 60,
  colors: {
    metal: 0x7d8894,
    dark: 0x2c3036,
    wood: 0x7a4a22,
    glow: 0x3ff6ff,
    flash: 0xfff1a8,
  },
};
