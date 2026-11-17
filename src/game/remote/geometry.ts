import * as THREE from 'three';
import { mergeParts, modelGeometry, shadedBox } from '../models/service';
import { Triple } from '../models/types';
import { WEAPON_IDS } from '../weapons/constants';
import { HELD_MODELS } from '../weapons/models';
import { WeaponId } from '../weapons/types';
import { AVATAR, AVATAR_COLORS, AVATAR_DETAIL } from './constants';
import { AvatarPartGeometries } from './types';

const CLOTH = 1;
const OWN_COLOR = 0;

/** Vertex tag of the arms themselves; a gun's vertices carry its weapon index + 1. */
const BARE_ARMS = 0;

/** `tint` 1 takes the player's color (instance color), 0 keeps the box's own color. */
const coloredBox = (
  size: Triple,
  center: Triple,
  color: number,
  tint: typeof CLOTH | typeof OWN_COLOR,
): THREE.BufferGeometry => shadedBox(size, center, color, { tint });

/** Marks every vertex of `geometry` with `tag` (see BARE_ARMS). */
const tagWeapon = (geometry: THREE.BufferGeometry, tag: number): THREE.BufferGeometry => {
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('weapon', new THREE.BufferAttribute(new Float32Array(count).fill(tag), 1));
  return geometry;
};

/** Where the right hand holds a gun, in the arms' frame (shoulder center, arms hanging down). */
const GRIP: Triple = [AVATAR.armOffsetX, -AVATAR.arm[1] - AVATAR_DETAIL.hand[1] / 2, 0];

/** Turns a held model (barrel along -z, top up) to hang along the arm: barrel down, top forward. */
const HOLD = new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(GRIP[0], GRIP[1], GRIP[2]);

/** Where the muzzle of `weapon` is, in the arms' frame. */
export const muzzleLocal = (weapon: WeaponId): Triple => {
  const point = new THREE.Vector3(...HELD_MODELS[weapon].muzzle).applyMatrix4(HOLD);
  return [point.x, point.y, point.z];
};

/**
 * The blocky soldier, one merged geometry per moving part, each around its pivot: legs at the
 * hip, head at the neck, both arms and every gun at the shoulders, the torso at the feet.
 */
export const buildAvatarParts = (): AvatarPartGeometries => {
  const legHeight = AVATAR.leg[1];
  const { boot } = AVATAR_DETAIL;
  const leg = mergeParts([
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
  const torso = mergeParts([
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
  const head = mergeParts([
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
  const bareArms = [-1, 1].flatMap((side) => [
    coloredBox(
      AVATAR.arm,
      [side * AVATAR.armOffsetX, -armLength / 2, 0],
      AVATAR_COLORS.cloth,
      CLOTH,
    ),
    coloredBox(
      hand,
      [side * AVATAR.armOffsetX, -armLength - hand[1] / 2, 0],
      AVATAR_COLORS.skin,
      OWN_COLOR,
    ),
  ]).map((geometry) => tagWeapon(geometry, BARE_ARMS));
  // Every gun in the right hand; the material shows only the one each player holds.
  const guns = WEAPON_IDS.map((id, index) => tagWeapon(
    modelGeometry(HELD_MODELS[id].parts).applyMatrix4(HOLD),
    index + 1,
  ));
  const arms = mergeParts([...bareArms, ...guns]);

  return {
    leg, torso, head, arms,
  };
};
