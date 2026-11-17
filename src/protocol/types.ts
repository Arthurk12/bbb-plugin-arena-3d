import { Vec3 } from '../commons/types';
import { AMMO_UPDATE, CLIENT_MESSAGE, ENV_KIND, SERVER_MESSAGE } from './constants';

// ---- client → relay ----

export interface HelloMessage {
  type: typeof CLIENT_MESSAGE.HELLO;
  v: number;
  round: string;
}

export interface PoseMessage {
  type: typeof CLIENT_MESSAGE.POSE;
  /** Feet position, meters. */
  p: Vec3;
  /** Yaw, radians. */
  y: number;
  /** Pitch, radians. */
  x: number;
  /** Weapon index. */
  w: number;
  /** Whether the player is in the arena (false once they hide it). */
  on: boolean;
}

export interface ShotMessage {
  type: typeof CLIENT_MESSAGE.SHOT;
  /** Shooter-wide sequence number, echoed in a `reject`. */
  id: number;
  /** Relay time of the remote state the shot was aimed at, ms. */
  vt: number;
  /** Eye position the shot left from. */
  o: Vec3;
  y: number;
  x: number;
  w: number;
  /** Seed of the pellet spread (see `seededRandom`). */
  seed: number;
  /** Fired fully zoomed in through the weapon's scope. */
  ads: boolean;
}

export type EnvKind = typeof ENV_KIND[keyof typeof ENV_KIND];

export interface EnvMessage {
  type: typeof CLIENT_MESSAGE.ENV;
  kind: EnvKind;
  amount: number;
  /** What caused it (`fall`, `slime`, `kit`…), for logs only. */
  cause: string;
}

export interface PingMessage {
  type: typeof CLIENT_MESSAGE.PING;
  /** Client clock when sent, echoed back. */
  c: number;
}

export interface ReloadMessage {
  type: typeof CLIENT_MESSAGE.RELOAD;
  /** Weapon index. */
  w: number;
}

export interface PickupMessage {
  type: typeof CLIENT_MESSAGE.PICKUP;
  /** Index in the level's pickups (an ammo box). */
  i: number;
}

export type ClientMessage = HelloMessage | PoseMessage | ShotMessage | EnvMessage | PingMessage
  | ReloadMessage | PickupMessage;

// ---- relay → client ----

/** [kills, deaths] */
export type ScoreLine = [number, number];
export type Scores = Record<string, ScoreLine>;

export interface PlayerInfo {
  id: string;
  name: string;
  p: Vec3;
  y: number;
  x: number;
  w: number;
  hp: number;
  alive: boolean;
  on: boolean;
}

export interface WelcomeMessage {
  type: typeof SERVER_MESSAGE.WELCOME;
  you: string;
  /** Relay clock, ms. */
  now: number;
  spectator: boolean;
  players: PlayerInfo[];
  scores: Scores;
  /** Display names of everyone in `scores`, including players who left. */
  names: Record<string, string>;
}

/** [id, x, y, z, yaw, pitch, weapon, flags] */
export type SnapshotEntry = [string, number, number, number, number, number, number, number];

export interface SnapshotMessage {
  type: typeof SERVER_MESSAGE.SNAPSHOT;
  /** Relay clock, ms: the time these poses are drawn at. */
  t: number;
  players: SnapshotEntry[];
}

export interface ShotEvent {
  type: typeof SERVER_MESSAGE.SHOT;
  by: string;
  id: number;
  o: Vec3;
  y: number;
  x: number;
  w: number;
  seed: number;
}

export interface HitEvent {
  type: typeof SERVER_MESSAGE.HIT;
  by: string;
  to: string;
  dmg: number;
  /** Body zone hit, as its index in HIT_ZONES (ENVIRONMENT_ZONE for the level). */
  zone: number;
  /** Target's health after the hit. */
  hp: number;
}

export interface HealthEvent {
  type: typeof SERVER_MESSAGE.HEALTH;
  id: string;
  hp: number;
}

export interface KillEvent {
  type: typeof SERVER_MESSAGE.KILL;
  /** Killer; equals `to` for a suicide or the level. */
  by: string;
  to: string;
  /** Killer's weapon index, or ENVIRONMENT_WEAPON. */
  w: number;
  /** Zone of the killing hit, as in `hit`. */
  zone: number;
}

export interface SpawnEvent {
  type: typeof SERVER_MESSAGE.SPAWN;
  id: string;
  p: Vec3;
  y: number;
}

export interface ScoresMessage {
  type: typeof SERVER_MESSAGE.SCORES;
  scores: Scores;
  names: Record<string, string>;
}

export interface JoinEvent {
  type: typeof SERVER_MESSAGE.JOIN;
  id: string;
  name: string;
}

export interface LeaveEvent {
  type: typeof SERVER_MESSAGE.LEAVE;
  id: string;
}

export interface PongMessage {
  type: typeof SERVER_MESSAGE.PONG;
  c: number;
  /** Relay clock, ms. */
  s: number;
}

export type RejectReason = 'dead' | 'spectator' | 'cooldown' | 'origin' | 'weapon' | 'ammo'
  | 'reloading';

export interface RejectMessage {
  type: typeof SERVER_MESSAGE.REJECT;
  id: number;
  reason: RejectReason;
}

/** [rounds in the magazine, rounds in reserve] */
export type AmmoLine = [number, number];

export type AmmoUpdate = typeof AMMO_UPDATE[keyof typeof AMMO_UPDATE];

/** A player's own ammo; sent to them only. */
export interface AmmoMessage {
  type: typeof SERVER_MESSAGE.AMMO;
  why: AmmoUpdate;
  /** Every weapon, in WEAPON_IDS order. */
  a: AmmoLine[];
}

export type ServerMessage = WelcomeMessage | SnapshotMessage | ShotEvent | HitEvent | HealthEvent
  | KillEvent | SpawnEvent | ScoresMessage | JoinEvent | LeaveEvent | PongMessage | RejectMessage
  | AmmoMessage;
