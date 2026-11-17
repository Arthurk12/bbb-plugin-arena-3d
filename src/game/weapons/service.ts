import { Vec3 } from '../../commons/types';
import { pointAlong, rayBoxes } from '../geometry/service';
import { Aabb } from '../geometry/types';
import { rayHitbox, worseZone } from '../hitbox/service';
import { HitZone, ZoneHit } from '../hitbox/types';
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
  pellets: number,
  spread: number,
  random: () => number,
): Vec3[] => Array.from({ length: pellets }, () => aimDirection(
  yaw + (random() * 2 - 1) * spread,
  pitch + (random() * 2 - 1) * spread,
));

/** Spread of a shot: tighter through the scope, for a weapon that has one. */
export const shotSpread = (weapon: WeaponDefinition, scoped: boolean): number => (
  scoped && weapon.scope ? weapon.scope.spread : weapon.spread
);

export const canFire = (lastShotAt: number, now: number, weapon: WeaponDefinition): boolean => (
  now - lastShotAt >= weapon.cooldownMs
);

export const weaponIndex = (id: WeaponId): number => WEAPON_IDS.indexOf(id);

export const weaponAt = (index: number): WeaponId => WEAPON_IDS[index] ?? DEFAULT_WEAPON;

export const cycleWeapon = (current: WeaponId, step: number): WeaponId => {
  const count = WEAPON_IDS.length;
  return WEAPON_IDS[(weaponIndex(current) + step + count) % count];
};

/** Share of the damage left at `distance` meters. */
export const falloffFactor = (weapon: WeaponDefinition, distance: number): number => {
  const { falloff } = weapon;
  if (!falloff || distance <= falloff.start) return 1;
  if (distance >= falloff.end) return falloff.minFactor;
  const progress = (distance - falloff.start) / (falloff.end - falloff.start);
  return 1 - (1 - falloff.minFactor) * progress;
};

/** Damage of one pellet hitting `zone` from `distance` meters. */
export const pelletDamage = (weapon: WeaponDefinition, zone: HitZone, distance: number): number => (
  weapon.damage * weapon.zoneMultipliers[zone] * falloffFactor(weapon, distance)
);

const nearestTarget = (origin: Vec3, dir: Vec3, targets: ShotTarget[], maxDistance: number) => {
  let best: { userId: string; hit: ZoneHit } | null = null;
  for (let i = 0; i < targets.length; i += 1) {
    const limit = best ? best.hit.distance : maxDistance;
    const hit = rayHitbox(origin, dir, targets[i].hitbox, limit);
    if (hit && (!best || hit.distance < best.hit.distance)) {
      best = { userId: targets[i].userId, hit };
    }
  }
  return best;
};

/**
 * Hitscan: each pellet stops at the first wall or player, and hurts by the zone it hit and the
 * distance it flew. The client runs it to draw at once; the relay runs it again to decide.
 */
export const resolveShot = (
  origin: Vec3,
  directions: Vec3[],
  solids: Aabb[],
  targets: ShotTarget[],
  weapon: WeaponDefinition,
): ShotResult => {
  const result: ShotResult = {
    damageByUser: new Map(), zoneByUser: new Map(), impacts: [], impactOnPlayer: [],
  };
  directions.forEach((dir) => {
    const wall = rayBoxes(origin, dir, solids, weapon.range);
    const target = nearestTarget(origin, dir, targets, wall);
    if (target) {
      const { userId, hit } = target;
      result.damageByUser.set(
        userId,
        (result.damageByUser.get(userId) ?? 0) + pelletDamage(weapon, hit.zone, hit.distance),
      );
      const previous = result.zoneByUser.get(userId);
      result.zoneByUser.set(userId, previous ? worseZone(previous, hit.zone) : hit.zone);
      result.impacts.push(pointAlong(origin, dir, hit.distance));
      result.impactOnPlayer.push(true);
    } else {
      result.impacts.push(pointAlong(origin, dir, wall));
      result.impactOnPlayer.push(false);
    }
  });
  return result;
};
