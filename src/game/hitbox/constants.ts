import { ARM_AIM, AVATAR } from '../remote/constants';
import { ZoneBox } from './types';

/** Body zones, most damaging first; the protocol sends a zone as its index here. */
export const HIT_ZONES = ['head', 'torso', 'arms', 'legs'] as const;

/** Arm and hand, hanging from the shoulder before the aim turns them forward, meters. */
const ARM_BOX = {
  inner: 0.3,
  outer: 0.5,
  length: 0.74,
  halfDepth: 0.11,
};

/**
 * Each zone as a box in the frame of the body part that carries it, matching the avatar as it
 * is drawn (facing -z, the back is +z): torso and legs stand on the feet; the head turns with
 * the pitch at the neck; the arms swing forward from the shoulders and follow the pitch too.
 */
export const ZONE_BOXES: ZoneBox[] = [
  {
    zone: 'head',
    pivotHeight: AVATAR.neckHeight,
    restAngle: 0,
    followsPitch: true,
    // Head and helmet; the visor sticks out in front.
    box: { min: [-0.22, 0, -0.24], max: [0.22, 0.42, 0.22] },
  },
  {
    zone: 'torso',
    pivotHeight: 0,
    restAngle: 0,
    followsPitch: false,
    // Belt to neck, backpack included.
    box: { min: [-0.34, AVATAR.hipHeight, -0.18], max: [0.34, AVATAR.neckHeight, 0.32] },
  },
  {
    zone: 'legs',
    pivotHeight: 0,
    restAngle: 0,
    followsPitch: false,
    // Deep enough for the walking swing.
    box: { min: [-0.26, 0, -0.25], max: [0.26, AVATAR.hipHeight, 0.25] },
  },
  ...[-1, 1].map((side): ZoneBox => ({
    zone: 'arms',
    pivotHeight: AVATAR.shoulderHeight,
    restAngle: ARM_AIM,
    followsPitch: true,
    box: {
      min: [side < 0 ? -ARM_BOX.outer : ARM_BOX.inner, -ARM_BOX.length, -ARM_BOX.halfDepth],
      max: [side < 0 ? -ARM_BOX.inner : ARM_BOX.outer, 0, ARM_BOX.halfDepth],
    },
  })),
];

/** Box around every zone in any pose, from the feet: a ray that misses it misses the player. */
export const HITBOX_BOUNDS = {
  halfWidth: 0.9,
  height: 2.3,
};
