import { describe, expect, it } from 'vitest';
import {
  aimDirection, canFire, cycleWeapon, pelletDirections, resolveShot, weaponAt, weaponIndex,
} from '../../src/game/weapons/service';
import { WEAPONS } from '../../src/game/weapons/constants';
import { ShotTarget } from '../../src/game/weapons/types';
import { createAabb, rayAabb } from '../../src/game/geometry/service';
import { writeHitboxes } from '../../src/game/remote/service';
import { block } from '../../src/game/level/service';
import { Vec3 } from '../../src/commons/types';

const targetAt = (userId: string, p: Vec3): ShotTarget => {
  const target = { userId, body: createAabb(), head: createAabb() };
  writeHitboxes({ p, y: 0, x: 0 }, target.body, target.head);
  return target;
};

const EYE: Vec3 = [0, 1.55, 0];

describe('aimDirection', () => {
  it('looks towards -z at yaw 0 and turns left with positive yaw', () => {
    expect(aimDirection(0, 0).map((v) => Math.round(v * 1000) / 1000)).toEqual([-0, 0, -1]);
    expect(aimDirection(Math.PI / 2, 0)[0]).toBeCloseTo(-1);
    expect(aimDirection(0, Math.PI / 2)[1]).toBeCloseTo(1);
  });
});

describe('rayAabb', () => {
  it('measures the distance to a box and misses beside it', () => {
    const box = block([-1, 0, -6], [1, 2, -4], 'crate');
    expect(rayAabb([0, 1, 0], [0, 0, -1], box, 100)).toBeCloseTo(4);
    expect(rayAabb([5, 1, 0], [0, 0, -1], box, 100)).toBeNull();
    expect(rayAabb([0, 1, 0], [0, 0, -1], box, 3)).toBeNull();
  });
});

describe('resolveShot', () => {
  it('hits the body of a player in front', () => {
    const result = resolveShot(EYE, [aimDirection(0, -0.1)], [], [targetAt('a', [0, 0, -10])], WEAPONS.blaster);
    expect(result.damageByUser.get('a')).toBe(WEAPONS.blaster.damage);
    expect(result.headshot).toBe(false);
  });

  it('doubles the damage of a headshot', () => {
    const result = resolveShot(EYE, [[0, 0, -1]], [], [targetAt('a', [0, 0, -10])], WEAPONS.blaster);
    expect(result.headshot).toBe(true);
    expect(result.damageByUser.get('a')).toBe(WEAPONS.blaster.damage * WEAPONS.blaster.headMultiplier);
  });

  it('is stopped by a wall in between', () => {
    const wall = block([-2, 0, -6], [2, 4, -5], 'wall');
    const result = resolveShot(EYE, [[0, 0, -1]], [wall], [targetAt('a', [0, 0, -10])], WEAPONS.blaster);
    expect(result.damageByUser.size).toBe(0);
    expect(result.impacts[0][2]).toBeCloseTo(-5);
  });

  it('hits only the nearest of two players in line', () => {
    const result = resolveShot(
      EYE,
      [[0, 0, -1]],
      [],
      [targetAt('far', [0, 0, -20]), targetAt('near', [0, 0, -8])],
      WEAPONS.blaster,
    );
    expect([...result.damageByUser.keys()]).toEqual(['near']);
  });

  it('adds up shotgun pellets per player', () => {
    const dirs = pelletDirections(0, -0.05, WEAPONS.shotgun, () => 0.5);
    const result = resolveShot(EYE, dirs, [], [targetAt('a', [0, 0, -4])], WEAPONS.shotgun);
    expect(dirs).toHaveLength(WEAPONS.shotgun.pellets);
    expect(result.damageByUser.get('a')).toBe(WEAPONS.shotgun.damage * WEAPONS.shotgun.pellets);
  });

  it('does not reach past the weapon range', () => {
    const result = resolveShot(EYE, [[0, 0, -1]], [], [targetAt('a', [0, 0, -100])], WEAPONS.shotgun);
    expect(result.damageByUser.size).toBe(0);
  });
});

describe('weapon selection', () => {
  it('respects the cooldown', () => {
    expect(canFire(0, WEAPONS.blaster.cooldownMs - 1, WEAPONS.blaster)).toBe(false);
    expect(canFire(0, WEAPONS.blaster.cooldownMs, WEAPONS.blaster)).toBe(true);
  });

  it('cycles both ways and maps indexes', () => {
    expect(cycleWeapon('blaster', 1)).toBe('shotgun');
    expect(cycleWeapon('blaster', -1)).toBe('shotgun');
    expect(weaponAt(weaponIndex('shotgun'))).toBe('shotgun');
    expect(weaponAt(42)).toBe('blaster');
  });
});
