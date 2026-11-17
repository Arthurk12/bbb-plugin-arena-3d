import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AVATAR, AVATAR_COLORS, AVATAR_DETAIL, FACE_SHADE } from './constants';
import { AvatarPartGeometries } from './types';

type Triple = [number, number, number];

/** Shade of each BoxGeometry face, in its order: +x, -x, +y, -y, +z, -z. */
const FACE_SHADES = [
  FACE_SHADE.side, FACE_SHADE.side, FACE_SHADE.top, FACE_SHADE.bottom, FACE_SHADE.front,
  FACE_SHADE.front,
];

const VERTICES_PER_FACE = 4;

const CLOTH = 1;
const OWN_COLOR = 0;

/**
 * A box with its color baked into the vertices, each face a little lighter or darker.
 * `tint` 1 takes the player's color (instance color), 0 keeps the box's own color.
 */
const coloredBox = (
  size: Triple,
  center: Triple,
  color: number,
  tint: typeof CLOTH | typeof OWN_COLOR,
): THREE.BufferGeometry => {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  geometry.translate(center[0], center[1], center[2]);
  const base = new THREE.Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const shade = FACE_SHADES[Math.floor(i / VERTICES_PER_FACE)];
    colors[i * 3] = base.r * shade;
    colors[i * 3 + 1] = base.g * shade;
    colors[i * 3 + 2] = base.b * shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(count).fill(tint), 1));
  return geometry;
};

const merge = (parts: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('avatar parts could not be merged');
  return merged;
};

/** Where the gun's muzzle is, in the arms' frame (shoulder center, arms hanging down). */
export const muzzleLocal = (): Triple => [
  AVATAR.armOffsetX,
  -AVATAR.arm[1] - AVATAR.gun[2] + AVATAR_DETAIL.gunGrip,
  -AVATAR.gun[1] / 2,
];

/**
 * The blocky soldier, one merged geometry per moving part, each around its pivot: legs at the
 * hip, head at the neck, both arms and the gun at the shoulders, the torso at the feet.
 */
export const buildAvatarParts = (): AvatarPartGeometries => {
  const legHeight = AVATAR.leg[1];
  const { boot } = AVATAR_DETAIL;
  const leg = merge([
    coloredBox(AVATAR.leg, [0, -legHeight / 2, 0], AVATAR_COLORS.legs, OWN_COLOR),
    coloredBox(
      boot,
      [0, -legHeight + boot[1] / 2, -AVATAR_DETAIL.bootForward],
      AVATAR_COLORS.boots,
      OWN_COLOR,
    ),
  ]);

  const torsoCenter = AVATAR.hipHeight + AVATAR.torso[1] / 2;
  const { belt, backpack, shoulderPad } = AVATAR_DETAIL;
  const torso = merge([
    coloredBox(AVATAR.torso, [0, torsoCenter, 0], AVATAR_COLORS.cloth, CLOTH),
    coloredBox(belt, [0, AVATAR.hipHeight + belt[1] / 2, 0], AVATAR_COLORS.belt, OWN_COLOR),
    // Facing -z, so the back is +z.
    coloredBox(
      backpack,
      [0, torsoCenter, AVATAR.torso[2] / 2 + backpack[2] / 2],
      AVATAR_COLORS.backpack,
      OWN_COLOR,
    ),
    ...[-1, 1].map((side) => coloredBox(
      shoulderPad,
      [side * (AVATAR.torso[0] / 2), AVATAR.shoulderHeight + shoulderPad[1] / 2, 0],
      AVATAR_COLORS.cloth,
      CLOTH,
    )),
  ]);

  const size = AVATAR.headSize;
  const helmetWidth = size + AVATAR_DETAIL.helmetExtra;
  const helmetTop = size + AVATAR_DETAIL.helmetRise;
  const helmetBottom = helmetTop - AVATAR_DETAIL.helmetHeight;
  const head = merge([
    coloredBox([size, size, size], [0, size / 2, 0], AVATAR_COLORS.skin, OWN_COLOR),
    coloredBox(
      [helmetWidth, AVATAR_DETAIL.helmetHeight, helmetWidth],
      [0, helmetTop - AVATAR_DETAIL.helmetHeight / 2, 0],
      AVATAR_COLORS.helmet,
      OWN_COLOR,
    ),
    // A band in the player's color around the helmet's rim.
    coloredBox(
      [helmetWidth + AVATAR_DETAIL.stripeHeight / 5, AVATAR_DETAIL.stripeHeight, helmetWidth
        + AVATAR_DETAIL.stripeHeight / 5],
      [0, helmetBottom + AVATAR_DETAIL.stripeHeight / 2, 0],
      AVATAR_COLORS.cloth,
      CLOTH,
    ),
    coloredBox(
      AVATAR.visor,
      [0, size * 0.55, -size / 2 - AVATAR.visor[2] / 2],
      AVATAR_COLORS.visor,
      OWN_COLOR,
    ),
  ]);

  const armLength = AVATAR.arm[1];
  const { hand } = AVATAR_DETAIL;
  const muzzle = muzzleLocal();
  const arms = merge([
    ...[-1, 1].flatMap((side) => [
      coloredBox(AVATAR.arm, [side * AVATAR.armOffsetX, -armLength / 2, 0], AVATAR_COLORS.cloth, CLOTH),
      coloredBox(
        hand,
        [side * AVATAR.armOffsetX, -armLength - hand[1] / 2, 0],
        AVATAR_COLORS.skin,
        OWN_COLOR,
      ),
    ]),
    // In the right hand, along the hanging arm: aiming turns it forward.
    coloredBox(
      [AVATAR.gun[0], AVATAR.gun[2], AVATAR.gun[1]],
      [muzzle[0], muzzle[1] + AVATAR.gun[2] / 2, muzzle[2]],
      AVATAR_COLORS.gun,
      OWN_COLOR,
    ),
  ]);

  return {
    leg, torso, head, arms,
  };
};
