import { Vec3 } from '../../commons/types';
import { pointAlong, rayAabb, rayBoxes } from '../geometry/service';
import { Aabb } from '../geometry/types';
import { DEFAULT_WEAPON, WEAPON_IDS } from './constants';
import {
  ShotResult, ShotTarget, WeaponDefinition, WeaponId,
} from './types';

/** Unit vector the camera looks along (yaw 0, pitch 0 looks towards -z). */
export const aimDirection = (yaw: number, pitch: number): Vec3 => {
  const cosPitch = Math.cos(pitch);
  return [-Math.sin(yaw) * cosPitch, Math.sin(pitch), -Math.cos(yaw) * cosPitch];
};

export const pelletDirections = (
  yaw: number,
  pitch: number,
  weapon: WeaponDefinition,
  random: () => number,
): Vec3[] => Array.from({ length: weapon.pellets }, () => aimDirection(
  yaw + (random() * 2 - 1) * weapon.spread,
  pitch + (random() * 2 - 1) * weapon.spread,
));

export const canFire = (lastShotAt: number, now: number, weapon: WeaponDefinition): boolean => (
  now - lastShotAt >= weapon.cooldownMs
);

export const weaponIndex = (id: WeaponId): number => WEAPON_IDS.indexOf(id);

export const weaponAt = (index: number): WeaponId => WEAPON_IDS[index] ?? DEFAULT_WEAPON;

export const cycleWeapon = (current: WeaponId, step: number): WeaponId => {
  const count = WEAPON_IDS.length;
  return WEAPON_IDS[(weaponIndex(current) + step + count) % count];
};

const nearestTarget = (origin: Vec3, dir: Vec3, targets: ShotTarget[], maxDistance: number) => {
  let best: { userId: string; distance: number; head: boolean } | null = null;
  targets.forEach((target) => {
    const limit = best ? best.distance : maxDistance;
    const head = rayAabb(origin, dir, target.head, limit);
    const body = rayAabb(origin, dir, target.body, limit);
    if (head !== null && (body === null || head <= body)) {
      best = { userId: target.userId, distance: head, head: true };
    } else if (body !== null) {
      best = { userId: target.userId, distance: body, head: false };
    }
  });
  return best as { userId: string; distance: number; head: boolean } | null;
};

/**
 * Hitscan: each pellet stops at the first wall or player. The shooter decides what it hit,
 * against the players as drawn on its own screen.
 */
export const resolveShot = (
  origin: Vec3,
  directions: Vec3[],
  solids: Aabb[],
  targets: ShotTarget[],
  weapon: WeaponDefinition,
): ShotResult => {
  const result: ShotResult = {
    damageByUser: new Map(), headshot: false, impacts: [], impactOnPlayer: [],
  };
  directions.forEach((dir) => {
    const wall = rayBoxes(origin, dir, solids, weapon.range);
    const target = nearestTarget(origin, dir, targets, wall);
    if (target) {
      const damage = weapon.damage * (target.head ? weapon.headMultiplier : 1);
      result.damageByUser.set(
        target.userId,
        (result.damageByUser.get(target.userId) ?? 0) + damage,
      );
      if (target.head) result.headshot = true;
      result.impacts.push(pointAlong(origin, dir, target.distance));
      result.impactOnPlayer.push(true);
    } else {
      result.impacts.push(pointAlong(origin, dir, wall));
      result.impactOnPlayer.push(false);
    }
  });
  return result;
};
