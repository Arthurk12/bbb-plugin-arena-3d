import { Vec3 } from '../../commons/types';
import { Hitbox, HitZone } from '../hitbox/types';
import { ModelPart, Triple } from '../models/types';
import { WEAPON_IDS } from './constants';

export type WeaponId = typeof WEAPON_IDS[number];

/** Damage fades linearly from `start` to `end` meters, down to `minFactor` of itself. */
export interface Falloff {
  start: number;
  end: number;
  minFactor: number;
}

/** Rounds of a weapon: one per shot (a shotgun shell counts once). */
export interface AmmoDefinition {
  /** Rounds in a full magazine. */
  magazine: number;
  /** Rounds carried besides the magazine when spawning. */
  startReserve: number;
  /** Most rounds carried besides the magazine. */
  maxReserve: number;
  /** Time to reload, ms; no shooting meanwhile. */
  reloadMs: number;
  /** Rounds an ammo box adds to the reserve. */
  pack: number;
}

/** An optical sight, looked through while the secondary button is held. */
export interface Scope {
  /** Field of view fully zoomed in, degrees. */
  fov: number;
  /** Pellet spread when fired fully zoomed in (`spread` is the spread from the hip). */
  spread: number;
  /** Time to zoom in fully, ms. */
  zoomMs: number;
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
  /** Null: no scope. */
  scope: Scope | null;
  ammo: AmmoDefinition;
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

/** A gun as seen in your hands: barrel along -z, top up, meters before VIEW_MODEL.scale. */
export interface WeaponModel {
  parts: ModelPart[];
  /** Where shots leave the barrel. */
  muzzle: Triple;
  /** Size of the muzzle flash. */
  flashSize: number;
  /** At full recoil: how far the gun comes back (meters) and tips up (radians). */
  kick: { distance: number; angle: number };
}

/** A gun as others see it: fewer parts, barrel along -z, top up, the hand at the origin. */
export interface HeldWeaponModel {
  parts: ModelPart[];
  muzzle: Triple;
}

export interface ViewModel {
  /** Lowers the gun in hand and raises `weapon` (VIEW_MODEL.switchMs). */
  setWeapon: (weapon: WeaponId, now: number) => void;
  /** Bobs with movement and recovers from recoil. */
  update: (dt: number, speed: number, now: number, visible: boolean) => void;
  fire: (now: number) => void;
  /** Dips and turns the gun for `durationMs` (a reload); switching weapons stops it. */
  reload: (now: number, durationMs: number) => void;
  dispose: () => void;
}
