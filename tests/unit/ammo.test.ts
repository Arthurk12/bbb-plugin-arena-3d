import { describe, expect, it } from 'vitest';
import {
  ammoFromLines, ammoLines, canReload, canTakeAmmoBox, hasRound, lowOnAmmo, reloaded, spawnAmmo,
  spendRound, withAmmoBox,
} from '../../src/game/ammo/service';
import { WEAPON_IDS, WEAPONS } from '../../src/game/weapons/constants';

const SNIPER = WEAPON_IDS.indexOf('sniper');

describe('ammo', () => {
  it('spawns with full magazines and the starting reserves', () => {
    const ammo = spawnAmmo();
    expect(ammo).toHaveLength(WEAPON_IDS.length);
    WEAPON_IDS.forEach((id, i) => {
      expect(ammo[i]).toEqual({
        mag: WEAPONS[id].ammo.magazine, reserve: WEAPONS[id].ammo.startReserve,
      });
    });
  });

  it('spends a round from one weapon only', () => {
    const ammo = spendRound(spawnAmmo(), 1);
    expect(ammo[1].mag).toBe(WEAPONS.shotgun.ammo.magazine - 1);
    expect(ammo[0]).toEqual(spawnAmmo()[0]);
    expect(hasRound([{ mag: 0, reserve: 5 }], 0)).toBe(false);
    expect(hasRound(spawnAmmo(), 9)).toBe(false);
  });

  it('reloads from the reserve as much as the magazine takes', () => {
    const ammo = spawnAmmo();
    ammo[SNIPER] = { mag: 1, reserve: 2 };
    expect(canReload(ammo, SNIPER)).toBe(true);
    expect(reloaded(ammo, SNIPER)[SNIPER]).toEqual({ mag: 3, reserve: 0 });
    expect(canReload(spawnAmmo(), SNIPER)).toBe(false);
    ammo[SNIPER] = { mag: 0, reserve: 0 };
    expect(canReload(ammo, SNIPER)).toBe(false);
  });

  it('tops up every reserve with an ammo box, up to the maximum', () => {
    const boxed = withAmmoBox(spawnAmmo());
    WEAPON_IDS.forEach((id, i) => {
      const rules = WEAPONS[id].ammo;
      expect(boxed[i].reserve).toBe(Math.min(rules.maxReserve, rules.startReserve + rules.pack));
    });
    const full = spawnAmmo().map((rounds, i) => ({
      ...rounds, reserve: WEAPONS[WEAPON_IDS[i]].ammo.maxReserve,
    }));
    expect(canTakeAmmoBox(full)).toBe(false);
    expect(canTakeAmmoBox(spawnAmmo())).toBe(true);
  });

  it('goes through the wire format unchanged', () => {
    const ammo = spendRound(spawnAmmo(), 2);
    expect(ammoFromLines(ammoLines(ammo))).toEqual(ammo);
  });

  it('says when the magazine is nearly empty', () => {
    const ammo = spawnAmmo();
    ammo[0] = { mag: 3, reserve: 0 };
    expect(lowOnAmmo(ammo, 0)).toBe(true);
    expect(lowOnAmmo(spawnAmmo(), 0)).toBe(false);
  });
});
