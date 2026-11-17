import { Vec3 } from '../../commons/types';
import { Hitbox, HitZone } from '../hitbox/types';
import { WEAPON_IDS } from './constants';

export type WeaponId = typeof WEAPON_IDS[number];

/** Damage fades linearly from `start` to `end` meters, down to `minFactor` of itself. */
export interface Falloff {
  start: number;
  end: number;
  minFactor: number;
}

export interface WeaponDefinition {
  id: WeaponId;
  cooldownMs: number;
  /** Rays per shot. */
  pellets: number;
  /** Max deviation of each pellet from the aim, radians. */
  spread: number;
  /** Damage per pellet on the torso, before falloff. */
  damage: number;
  range: number; // meters
  /** Damage multiplier of each body zone. */
  zoneMultipliers: Record<HitZone, number>;
  /** Null: the same damage at any distance. */
  falloff: Falloff | null;
  /** Camera kick per shot, radians. */
  recoil: number;
  tracerColor: number;
}

/** A remote player as a shot sees them. */
export interface ShotTarget {
  userId: string;
  hitbox: Hitbox;
}

export interface ShotResult {
  damageByUser: Map<string, number>;
  /** The most damaging zone each player was hit in (head first), for markers and the feed. */
  zoneByUser: Map<string, HitZone>;
  /** Where each pellet stopped (a wall, a player, or its range). */
  impacts: Vec3[];
  /** Whether each impact hit a player (for the effect drawn there). */
  impactOnPlayer: boolean[];
}

export interface ViewModel {
  setWeapon: (weapon: WeaponId) => void;
  /** Bobs with movement and recovers from recoil. */
  update: (dt: number, speed: number, now: number, visible: boolean) => void;
  fire: (now: number) => void;
  dispose: () => void;
}
