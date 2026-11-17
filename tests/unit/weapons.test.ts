import { describe, expect, it } from 'vitest';
import {
  aimDirection, canFire, cycleWeapon, falloffFactor, pelletDamage, pelletDirections,
  resolveShot, shotSpread, weaponAt, weaponIndex,
} from '../../src/game/weapons/service';
import { WEAPONS } from '../../src/game/weapons/constants';
import { ShotTarget } from '../../src/game/weapons/types';
import { rayAabb } from '../../src/game/geometry/service';
import { createHitbox, writeHitbox } from '../../src/game/hitbox/service';
import { block } from '../../src/game/level/service';
import { Vec3 } from '../../src/commons/types';

const targetAt = (userId: string, p: Vec3): ShotTarget => ({
  userId,
  hitbox: writeHitbox({ p, y: 0, x: 0 }, createHitbox()),
});

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
  it('hits the torso of a player in front with the base damage', () => {
    const result = resolveShot(EYE, [aimDirection(0, -0.05)], [], [targetAt('a', [0, 0, -10])], WEAPONS.blaster);
    expect(result.damageByUser.get('a')).toBe(WEAPONS.blaster.damage);
    expect(result.zoneByUser.get('a')).toBe('torso');
  });

  it('multiplies the damage of a headshot', () => {
    const result = resolveShot(EYE, [[0, 0, -1]], [], [targetAt('a', [0, 0, -10])], WEAPONS.blaster);
    expect(result.zoneByUser.get('a')).toBe('head');
    expect(result.damageByUser.get('a')).toBe(
      WEAPONS.blaster.damage * WEAPONS.blaster.zoneMultipliers.head,
    );
  });

  it('does less damage to the legs', () => {
    const toLegs: Vec3 = [0, 0.4 - EYE[1], -10];
    const length = Math.hypot(...toLegs);
    const dir: Vec3 = [toLegs[0] / length, toLegs[1] / length, toLegs[2] / length];
    const result = resolveShot(EYE, [dir], [], [targetAt('a', [0, 0, -10])], WEAPONS.blaster);
    expect(result.zoneByUser.get('a')).toBe('legs');
    expect(result.damageByUser.get('a')).toBeCloseTo(
      WEAPONS.blaster.damage * WEAPONS.blaster.zoneMultipliers.legs,
    );
  });

  it('tells which zone each player was hit in', () => {
    const toBody: Vec3 = [3, 1.0 - EYE[1], -10];
    const length = Math.hypot(...toBody);
    const result = resolveShot(
      EYE,
      [[0, 0, -1], [toBody[0] / length, toBody[1] / length, toBody[2] / length]],
      [],
      [targetAt('a', [0, 0, -10]), targetAt('b', [3, 0, -10])],
      WEAPONS.shotgun,
    );
    expect(result.zoneByUser.get('a')).toBe('head');
    expect(result.zoneByUser.get('b')).toBe('torso');
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
    const { pellets, spread } = WEAPONS.shotgun;
    const dirs = pelletDirections(0, -0.05, pellets, spread, () => 0.5);
    const result = resolveShot(EYE, dirs, [], [targetAt('a', [0, 0, -4])], WEAPONS.shotgun);
    expect(dirs).toHaveLength(WEAPONS.shotgun.pellets);
    expect(result.damageByUser.get('a')).toBe(WEAPONS.shotgun.damage * WEAPONS.shotgun.pellets);
    expect(result.zoneByUser.get('a')).toBe('torso');
  });

  it('does not reach past the weapon range', () => {
    const result = resolveShot(EYE, [[0, 0, -1]], [], [targetAt('a', [0, 0, -100])], WEAPONS.shotgun);
    expect(result.damageByUser.size).toBe(0);
  });
});

describe('damage', () => {
  it('fades with distance between the falloff bounds', () => {
    expect(falloffFactor(WEAPONS.shotgun, 5)).toBe(1);
    expect(falloffFactor(WEAPONS.shotgun, 19)).toBeCloseTo(0.65);
    expect(falloffFactor(WEAPONS.shotgun, 30)).toBeCloseTo(0.3);
    expect(falloffFactor(WEAPONS.shotgun, 100)).toBeCloseTo(0.3);
  });

  it('combines the zone and the distance', () => {
    expect(pelletDamage(WEAPONS.blaster, 'head', 10)).toBe(44);
    expect(pelletDamage(WEAPONS.blaster, 'arms', 100)).toBeCloseTo(22 * 0.75 * 0.7);
  });
});

describe('weapon selection', () => {
  it('respects the cooldown', () => {
    expect(canFire(0, WEAPONS.blaster.cooldownMs - 1, WEAPONS.blaster)).toBe(false);
    expect(canFire(0, WEAPONS.blaster.cooldownMs, WEAPONS.blaster)).toBe(true);
  });

  it('cycles both ways through the four weapons and maps indexes', () => {
    expect(cycleWeapon('blaster', 1)).toBe('shotgun');
    expect(cycleWeapon('blaster', -1)).toBe('sniper');
    expect(cycleWeapon('sniper', 1)).toBe('blaster');
    expect(weaponAt(weaponIndex('smg'))).toBe('smg');
    expect(weaponAt(42)).toBe('blaster');
  });

  it('tightens the sniper through its scope, and only the sniper', () => {
    expect(shotSpread(WEAPONS.sniper, false)).toBe(WEAPONS.sniper.spread);
    expect(shotSpread(WEAPONS.sniper, true)).toBe(0);
    expect(shotSpread(WEAPONS.shotgun, true)).toBe(WEAPONS.shotgun.spread);
  });
});
