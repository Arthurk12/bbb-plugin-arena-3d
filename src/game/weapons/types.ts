import { Vec3 } from '../../commons/types';
import { Aabb } from '../geometry/types';
import { WEAPON_IDS } from './constants';

export type WeaponId = typeof WEAPON_IDS[number];

export interface WeaponDefinition {
  id: WeaponId;
  cooldownMs: number;
  /** Rays per shot. */
  pellets: number;
  /** Max deviation of each pellet from the aim, radians. */
  spread: number;
  /** Damage per pellet. */
  damage: number;
  range: number; // meters
  headMultiplier: number;
  /** Camera kick per shot, radians. */
  recoil: number;
  tracerColor: number;
}

/** A remote player as a shot sees them. */
export interface ShotTarget {
  userId: string;
  body: Aabb;
  head: Aabb;
}

export interface ShotResult {
  damageByUser: Map<string, number>;
  headshot: boolean;
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
