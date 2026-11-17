import { WeaponDefinition, WeaponId } from './types';

export const WEAPON_IDS = ['blaster', 'shotgun', 'smg', 'sniper'] as const;

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  blaster: {
    id: 'blaster',
    cooldownMs: 320,
    pellets: 1,
    spread: 0.004,
    damage: 22,
    range: 150,
    zoneMultipliers: {
      head: 2, torso: 1, arms: 0.75, legs: 0.75,
    },
    falloff: { start: 40, end: 100, minFactor: 0.7 },
    recoil: 0.012,
    tracerColor: 0xffd34d,
    scope: null,
    ammo: { magazine: 12, startReserve: 36, maxReserve: 72, reloadMs: 1100, pack: 24 },
  },
  shotgun: {
    id: 'shotgun',
    cooldownMs: 950,
    pellets: 9,
    spread: 0.07,
    damage: 9,
    range: 60,
    zoneMultipliers: {
      head: 1.25, torso: 1, arms: 0.8, legs: 0.8,
    },
    falloff: { start: 8, end: 30, minFactor: 0.3 },
    recoil: 0.05,
    tracerColor: 0xff8a3d,
    scope: null,
    ammo: { magazine: 6, startReserve: 12, maxReserve: 24, reloadMs: 1800, pack: 8 },
  },
  smg: {
    id: 'smg',
    cooldownMs: 100,
    pellets: 1,
    spread: 0.022,
    damage: 8,
    range: 100,
    zoneMultipliers: {
      head: 1.5, torso: 1, arms: 0.75, legs: 0.75,
    },
    falloff: { start: 15, end: 45, minFactor: 0.5 },
    recoil: 0.006,
    tracerColor: 0x9dff5c,
    scope: null,
    ammo: { magazine: 30, startReserve: 60, maxReserve: 150, reloadMs: 1600, pack: 60 },
  },
  sniper: {
    id: 'sniper',
    cooldownMs: 1400,
    pellets: 1,
    spread: 0.03,
    damage: 70,
    range: 250,
    zoneMultipliers: {
      head: 2, torso: 1, arms: 0.6, legs: 0.6,
    },
    falloff: null,
    recoil: 0.06,
    tracerColor: 0x7fd4ff,
    scope: { fov: 20, spread: 0, zoomMs: 150 },
    ammo: { magazine: 5, startReserve: 5, maxReserve: 15, reloadMs: 2200, pack: 5 },
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
  flashMs: 60,
  /** Lowering the old gun and raising the new one; no shooting meanwhile. */
  switchMs: 260,
  /** How far the gun drops (meters) and tips down (radians) halfway through a switch. */
  switchDrop: 0.25,
  switchTilt: 0.6,
  /** Standing still, the gun sways in a slow figure eight. */
  swayFrequency: 1.1, // radians per second
  swayAmplitude: 0.006, // meters
  /** Height of the figure eight relative to its width. */
  swayHeight: 0.5,
  /** Halfway through a reload the gun dips (meters), tips down and rolls (radians). */
  reloadDrop: 0.1,
  reloadTilt: 0.35,
  reloadRoll: 0.6,
  flashColor: 0xfff1a8,
};

/** Colors of the gun models. */
export const WEAPON_PALETTE = {
  steel: 0xa9b3bd,
  metal: 0x7d8894,
  gunmetal: 0x4a5059,
  dark: 0x2c3036,
  rubber: 0x1c1e22,
  wood: 0x7a4a22,
  woodDark: 0x5a3418,
  olive: 0x5b6142,
  oliveDark: 0x464b33,
  brass: 0xc9a43a,
  shell: 0xb3312a,
  cyan: 0x3ff6ff,
  green: 0x9dff5c,
  lens: 0x7fd4ff,
};
