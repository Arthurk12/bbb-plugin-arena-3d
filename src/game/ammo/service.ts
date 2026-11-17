import { AmmoLine } from '../../protocol/types';
import { WEAPON_IDS, WEAPONS } from '../weapons/constants';
import { AmmoDefinition } from '../weapons/types';
import { LOW_AMMO_SHARE } from './constants';
import { Ammo } from './types';

const isWeapon = (index: number): boolean => (
  Number.isInteger(index) && index >= 0 && index < WEAPON_IDS.length
);

const rulesOf = (index: number): AmmoDefinition => WEAPONS[WEAPON_IDS[index]].ammo;

/** Full magazines and the starting reserves: what a player spawns with. */
export const spawnAmmo = (): Ammo => WEAPON_IDS.map((id) => ({
  mag: WEAPONS[id].ammo.magazine,
  reserve: WEAPONS[id].ammo.startReserve,
}));

/** Whether weapon `index` has a round in its magazine. */
export const hasRound = (ammo: Ammo, index: number): boolean => (
  isWeapon(index) && (ammo[index]?.mag ?? 0) > 0
);

/** One round out of weapon `index`'s magazine. */
export const spendRound = (ammo: Ammo, index: number): Ammo => ammo.map((rounds, i) => (
  i === index ? { ...rounds, mag: Math.max(0, rounds.mag - 1) } : rounds
));

/** Whether weapon `index` has room in its magazine and rounds in reserve to fill it. */
export const canReload = (ammo: Ammo, index: number): boolean => (
  isWeapon(index) && !!ammo[index]
  && ammo[index].mag < rulesOf(index).magazine && ammo[index].reserve > 0
);

/** Weapon `index`'s magazine filled from its reserve, as far as the reserve goes. */
export const reloaded = (ammo: Ammo, index: number): Ammo => ammo.map((rounds, i) => {
  if (i !== index) return rounds;
  const moved = Math.min(rulesOf(i).magazine - rounds.mag, rounds.reserve);
  return { mag: rounds.mag + moved, reserve: rounds.reserve - moved };
});

/** Whether an ammo box would add anything: some reserve is below its maximum. */
export const canTakeAmmoBox = (ammo: Ammo): boolean => ammo.some((rounds, i) => (
  rounds.reserve < rulesOf(i).maxReserve
));

/** Every weapon's reserve topped up by its pack, up to its maximum. */
export const withAmmoBox = (ammo: Ammo): Ammo => ammo.map((rounds, i) => ({
  ...rounds,
  reserve: Math.min(rulesOf(i).maxReserve, rounds.reserve + rulesOf(i).pack),
}));

/** Whether weapon `index`'s magazine is nearly empty. */
export const lowOnAmmo = (ammo: Ammo, index: number): boolean => (
  isWeapon(index) && ammo[index].mag <= rulesOf(index).magazine * LOW_AMMO_SHARE
);

export const ammoLines = (ammo: Ammo): AmmoLine[] => ammo.map(({ mag, reserve }) => [mag, reserve]);

export const ammoFromLines = (lines: AmmoLine[]): Ammo => lines.map(([mag, reserve]) => ({
  mag, reserve,
}));
