/** Rounds of one weapon: in its magazine, and carried besides it. */
export interface WeaponAmmo {
  mag: number;
  reserve: number;
}

/** Every weapon's rounds, in WEAPON_IDS order. */
export type Ammo = WeaponAmmo[];
