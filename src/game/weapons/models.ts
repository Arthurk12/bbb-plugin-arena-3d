import { ModelPart } from '../models/types';
import { VIEW_MODEL, WEAPON_PALETTE as C } from './constants';
import { HeldWeaponModel, WeaponId, WeaponModel } from './types';

/** Muzzle flash, a unit-sized burst scaled by each gun's `flashSize`. */
export const FLASH_PARTS: ModelPart[] = [
  { size: [0.5, 0.5, 0.5], at: [0, 0, 0], color: VIEW_MODEL.flashColor, glow: true },
  { size: [1, 0.14, 0.14], at: [0, 0, 0], color: VIEW_MODEL.flashColor, glow: true },
  { size: [0.14, 1, 0.14], at: [0, 0, 0], color: VIEW_MODEL.flashColor, glow: true },
  { size: [0.2, 0.2, 0.9], at: [0, 0, -0.2], color: VIEW_MODEL.flashColor, glow: true },
];

/** The guns in your hands. */
export const VIEW_MODELS: Record<WeaponId, WeaponModel> = {
  blaster: {
    parts: [
      // Slide, frame, vents and hammer
      { size: [0.085, 0.07, 0.36], at: [0, 0.035, -0.04], color: C.metal },
      { size: [0.08, 0.045, 0.26], at: [0, -0.02, 0.01], color: C.gunmetal },
      { size: [0.088, 0.012, 0.025], at: [0, 0.045, -0.15], color: C.dark },
      { size: [0.088, 0.012, 0.025], at: [0, 0.045, -0.11], color: C.dark },
      { size: [0.088, 0.012, 0.025], at: [0, 0.045, -0.07], color: C.dark },
      { size: [0.05, 0.04, 0.03], at: [0, 0.04, 0.155], color: C.dark },
      // Sights
      { size: [0.012, 0.025, 0.02], at: [-0.025, 0.08, 0.12], color: C.dark },
      { size: [0.012, 0.025, 0.02], at: [0.025, 0.08, 0.12], color: C.dark },
      { size: [0.012, 0.025, 0.02], at: [0, 0.08, -0.2], color: C.dark },
      // Barrel
      { size: [0.06, 0.055, 0.12], at: [0, 0.03, -0.27], color: C.gunmetal },
      { size: [0.035, 0.035, 0.1], at: [0, 0.03, -0.36], color: C.dark },
      // Grip with its ridges and magazine base, guard and trigger
      {
        size: [0.07, 0.17, 0.085], at: [0, -0.12, 0.1], color: C.rubber, tilt: -0.25,
      },
      {
        size: [0.074, 0.012, 0.07], at: [0, -0.08, 0.09], color: C.gunmetal, tilt: -0.25,
      },
      {
        size: [0.074, 0.012, 0.07], at: [0, -0.12, 0.1], color: C.gunmetal, tilt: -0.25,
      },
      {
        size: [0.074, 0.012, 0.07], at: [0, -0.16, 0.11], color: C.gunmetal, tilt: -0.25,
      },
      {
        size: [0.075, 0.02, 0.09], at: [0, -0.205, 0.12], color: C.metal, tilt: -0.25,
      },
      { size: [0.02, 0.012, 0.09], at: [0, -0.075, -0.02], color: C.gunmetal },
      { size: [0.02, 0.04, 0.012], at: [0, -0.055, -0.065], color: C.gunmetal },
      { size: [0.014, 0.035, 0.012], at: [0, -0.055, -0.005], color: C.steel },
      // Energy cells, top strip and muzzle ring
      {
        size: [0.012, 0.035, 0.13], at: [0.047, 0.03, -0.06], color: C.cyan, glow: true,
      },
      {
        size: [0.012, 0.035, 0.13], at: [-0.047, 0.03, -0.06], color: C.cyan, glow: true,
      },
      {
        size: [0.03, 0.008, 0.2], at: [0, 0.074, -0.06], color: C.cyan, glow: true,
      },
      {
        size: [0.045, 0.045, 0.012], at: [0, 0.03, -0.41], color: C.cyan, glow: true,
      },
    ],
    muzzle: [0, 0.03, -0.42],
    flashSize: 0.14,
    kick: { distance: 0.08, angle: 0.25 },
  },
  shotgun: {
    parts: [
      // Receiver, top rib and ejection port
      { size: [0.1, 0.11, 0.26], at: [0, 0, 0.08], color: C.gunmetal },
      { size: [0.03, 0.012, 0.26], at: [0, 0.061, 0.08], color: C.dark },
      { size: [0.004, 0.04, 0.09], at: [0.051, 0.015, 0.06], color: C.rubber },
      // Shells on the side saddle
      { size: [0.012, 0.022, 0.05], at: [-0.056, 0.01, 0.02], color: C.shell },
      { size: [0.012, 0.022, 0.05], at: [-0.056, 0.01, 0.08], color: C.shell },
      { size: [0.012, 0.022, 0.05], at: [-0.056, 0.01, 0.14], color: C.shell },
      // Barrel with its heat shield, magazine tube, band, muzzle and bead
      { size: [0.045, 0.045, 0.62], at: [0, 0.025, -0.36], color: C.dark },
      { size: [0.055, 0.02, 0.07], at: [0, 0.052, -0.15], color: C.gunmetal },
      { size: [0.055, 0.02, 0.07], at: [0, 0.052, -0.25], color: C.gunmetal },
      { size: [0.055, 0.02, 0.07], at: [0, 0.052, -0.35], color: C.gunmetal },
      { size: [0.055, 0.02, 0.07], at: [0, 0.052, -0.45], color: C.gunmetal },
      { size: [0.04, 0.04, 0.5], at: [0, -0.03, -0.3], color: C.metal },
      { size: [0.06, 0.1, 0.03], at: [0, 0, -0.6], color: C.gunmetal },
      { size: [0.05, 0.05, 0.02], at: [0, 0.025, -0.675], color: C.metal },
      { size: [0.012, 0.012, 0.012], at: [0, 0.054, -0.66], color: C.brass },
      // Pump and its grooves
      { size: [0.075, 0.065, 0.18], at: [0, -0.03, -0.32], color: C.wood },
      { size: [0.078, 0.008, 0.02], at: [0, -0.03, -0.38], color: C.woodDark },
      { size: [0.078, 0.008, 0.02], at: [0, -0.03, -0.32], color: C.woodDark },
      { size: [0.078, 0.008, 0.02], at: [0, -0.03, -0.26], color: C.woodDark },
      // Guard, trigger, grip, stock and butt pad
      { size: [0.025, 0.012, 0.1], at: [0, -0.085, 0.1], color: C.dark },
      { size: [0.025, 0.04, 0.012], at: [0, -0.065, 0.05], color: C.dark },
      { size: [0.015, 0.035, 0.012], at: [0, -0.06, 0.1], color: C.steel },
      {
        size: [0.065, 0.12, 0.08], at: [0, -0.09, 0.23], color: C.wood, tilt: -0.45,
      },
      {
        size: [0.075, 0.1, 0.3], at: [0, -0.06, 0.38], color: C.wood, tilt: 0.12,
      },
      {
        size: [0.08, 0.115, 0.03], at: [0, -0.08, 0.54], color: C.rubber, tilt: 0.12,
      },
    ],
    muzzle: [0, 0.025, -0.69],
    flashSize: 0.2,
    kick: { distance: 0.12, angle: 0.35 },
  },
  smg: {
    parts: [
      // Receiver, lower, rear plate and charging handle
      { size: [0.07, 0.07, 0.3], at: [0, 0.02, -0.05], color: C.gunmetal },
      { size: [0.065, 0.05, 0.2], at: [0, -0.035, 0], color: C.dark },
      { size: [0.06, 0.06, 0.02], at: [0, 0.02, 0.105], color: C.dark },
      { size: [0.03, 0.015, 0.03], at: [0.045, 0.035, 0.05], color: C.steel },
      // Handguard with vents, suppressor and muzzle glow
      { size: [0.07, 0.06, 0.16], at: [0, 0.015, -0.27], color: C.dark },
      { size: [0.074, 0.012, 0.025], at: [0, 0.015, -0.22], color: C.rubber },
      { size: [0.074, 0.012, 0.025], at: [0, 0.015, -0.27], color: C.rubber },
      { size: [0.074, 0.012, 0.025], at: [0, 0.015, -0.32], color: C.rubber },
      { size: [0.04, 0.04, 0.14], at: [0, 0.02, -0.41], color: C.metal },
      {
        size: [0.045, 0.045, 0.01], at: [0, 0.02, -0.485], color: C.green, glow: true,
      },
      // Rail with its ridges, and the red-dot sight
      { size: [0.04, 0.012, 0.24], at: [0, 0.062, -0.07], color: C.dark },
      { size: [0.044, 0.01, 0.015], at: [0, 0.072, -0.16], color: C.gunmetal },
      { size: [0.044, 0.01, 0.015], at: [0, 0.072, -0.12], color: C.gunmetal },
      { size: [0.044, 0.01, 0.015], at: [0, 0.072, -0.08], color: C.gunmetal },
      { size: [0.044, 0.01, 0.015], at: [0, 0.072, 0.04], color: C.gunmetal },
      { size: [0.05, 0.05, 0.08], at: [0, 0.1, -0.02], color: C.dark },
      {
        size: [0.034, 0.034, 0.006], at: [0, 0.105, -0.063], color: C.green, glow: true,
      },
      // Curved magazine, grip, foregrip, guard and trigger
      {
        size: [0.045, 0.14, 0.055], at: [0, -0.12, -0.08], color: C.metal, tilt: 0.15,
      },
      {
        size: [0.045, 0.06, 0.055], at: [0, -0.21, -0.105], color: C.metal, tilt: 0.35,
      },
      {
        size: [0.055, 0.13, 0.065], at: [0, -0.1, 0.07], color: C.rubber, tilt: -0.25,
      },
      { size: [0.04, 0.1, 0.045], at: [0, -0.07, -0.26], color: C.rubber },
      { size: [0.02, 0.012, 0.07], at: [0, -0.07, 0], color: C.dark },
      { size: [0.012, 0.03, 0.01], at: [0, -0.05, 0.01], color: C.steel },
      // Folding stock
      { size: [0.012, 0.012, 0.22], at: [-0.025, 0, 0.21], color: C.metal },
      { size: [0.012, 0.012, 0.22], at: [0.025, 0, 0.21], color: C.metal },
      { size: [0.07, 0.09, 0.02], at: [0, -0.02, 0.32], color: C.rubber },
    ],
    muzzle: [0, 0.02, -0.5],
    flashSize: 0.11,
    kick: { distance: 0.03, angle: 0.08 },
  },
  sniper: {
    parts: [
      // Receiver, bolt and magazine
      { size: [0.075, 0.075, 0.3], at: [0, 0.01, 0], color: C.gunmetal },
      { size: [0.06, 0.012, 0.012], at: [0.06, 0.03, 0.06], color: C.steel },
      { size: [0.025, 0.025, 0.025], at: [0.095, 0.03, 0.06], color: C.dark },
      { size: [0.05, 0.06, 0.08], at: [0, -0.055, -0.03], color: C.dark },
      // Barrel and muzzle brake
      { size: [0.05, 0.05, 0.12], at: [0, 0.025, -0.2], color: C.dark },
      { size: [0.035, 0.035, 0.62], at: [0, 0.025, -0.46], color: C.dark },
      { size: [0.055, 0.045, 0.08], at: [0, 0.025, -0.8], color: C.metal },
      { size: [0.058, 0.01, 0.015], at: [0, 0.025, -0.785], color: C.rubber },
      { size: [0.058, 0.01, 0.015], at: [0, 0.025, -0.815], color: C.rubber },
      // Forend and folded bipod
      { size: [0.08, 0.07, 0.34], at: [0, -0.02, -0.28], color: C.olive },
      { size: [0.012, 0.012, 0.22], at: [-0.03, -0.065, -0.5], color: C.metal },
      { size: [0.012, 0.012, 0.22], at: [0.03, -0.065, -0.5], color: C.metal },
      // Grip, guard, trigger, stock, cheek rest and butt pad
      {
        size: [0.06, 0.12, 0.07], at: [0, -0.1, 0.12], color: C.olive, tilt: -0.3,
      },
      { size: [0.02, 0.012, 0.08], at: [0, -0.07, 0.05], color: C.dark },
      { size: [0.012, 0.03, 0.01], at: [0, -0.05, 0.05], color: C.steel },
      { size: [0.075, 0.09, 0.3], at: [0, -0.03, 0.28], color: C.olive },
      { size: [0.06, 0.035, 0.16], at: [0, 0.035, 0.3], color: C.oliveDark },
      { size: [0.08, 0.12, 0.03], at: [0, -0.04, 0.445], color: C.rubber },
      // Scope: rings, tube, bells, turrets and lenses
      { size: [0.03, 0.04, 0.025], at: [0, 0.065, -0.07], color: C.dark },
      { size: [0.03, 0.04, 0.025], at: [0, 0.065, 0.08], color: C.dark },
      { size: [0.045, 0.045, 0.34], at: [0, 0.105, 0], color: C.dark },
      { size: [0.07, 0.07, 0.08], at: [0, 0.105, -0.2], color: C.dark },
      { size: [0.06, 0.06, 0.07], at: [0, 0.105, 0.2], color: C.dark },
      { size: [0.03, 0.03, 0.03], at: [0, 0.14, 0], color: C.metal },
      { size: [0.03, 0.03, 0.03], at: [0.035, 0.105, 0], color: C.metal },
      {
        size: [0.056, 0.056, 0.006], at: [0, 0.105, -0.243], color: C.lens, glow: true,
      },
      {
        size: [0.046, 0.046, 0.006], at: [0, 0.105, 0.238], color: C.lens, glow: true,
      },
    ],
    muzzle: [0, 0.025, -0.85],
    flashSize: 0.18,
    kick: { distance: 0.14, angle: 0.4 },
  },
};

/** The guns in other players' hands, simpler: they are seen from afar. */
export const HELD_MODELS: Record<WeaponId, HeldWeaponModel> = {
  blaster: {
    parts: [
      { size: [0.07, 0.08, 0.26], at: [0, 0.04, -0.08], color: C.gunmetal },
      { size: [0.035, 0.035, 0.08], at: [0, 0.05, -0.25], color: C.dark },
      { size: [0.05, 0.11, 0.06], at: [0, -0.03, 0.02], color: C.rubber },
      {
        size: [0.02, 0.006, 0.14], at: [0, 0.083, -0.08], color: C.cyan, glow: true,
      },
    ],
    muzzle: [0, 0.05, -0.29],
  },
  shotgun: {
    parts: [
      { size: [0.08, 0.09, 0.2], at: [0, 0.03, -0.02], color: C.gunmetal },
      { size: [0.04, 0.04, 0.45], at: [0, 0.05, -0.34], color: C.dark },
      { size: [0.06, 0.05, 0.14], at: [0, 0, -0.3], color: C.wood },
      {
        size: [0.05, 0.09, 0.06], at: [0, -0.04, 0.06], color: C.wood, tilt: -0.4,
      },
      { size: [0.06, 0.08, 0.24], at: [0, 0, 0.2], color: C.wood },
    ],
    muzzle: [0, 0.05, -0.57],
  },
  smg: {
    parts: [
      { size: [0.06, 0.07, 0.3], at: [0, 0.04, -0.08], color: C.gunmetal },
      { size: [0.04, 0.12, 0.045], at: [0, -0.05, -0.12], color: C.metal },
      { size: [0.035, 0.035, 0.1], at: [0, 0.045, -0.28], color: C.metal },
      { size: [0.04, 0.04, 0.06], at: [0, 0.095, -0.05], color: C.dark },
      {
        size: [0.03, 0.03, 0.006], at: [0, 0.095, -0.083], color: C.green, glow: true,
      },
    ],
    muzzle: [0, 0.045, -0.33],
  },
  sniper: {
    parts: [
      { size: [0.06, 0.07, 0.3], at: [0, 0.03, -0.02], color: C.olive },
      { size: [0.03, 0.03, 0.5], at: [0, 0.045, -0.42], color: C.dark },
      { size: [0.06, 0.09, 0.26], at: [0, 0, 0.25], color: C.olive },
      { size: [0.04, 0.04, 0.26], at: [0, 0.11, -0.03], color: C.dark },
      {
        size: [0.045, 0.045, 0.006], at: [0, 0.11, -0.163], color: C.lens, glow: true,
      },
    ],
    muzzle: [0, 0.045, -0.67],
  },
};
