import { Vec3 } from '../../src/commons/types';
import { Ammo } from '../../src/game/ammo/types';
import { CombatState } from '../../src/game/combat/types';
import { LevelDefinition } from '../../src/game/level/types';
import { ShotResult } from '../../src/game/weapons/types';
import { ClientMessage, RejectReason, ServerMessage } from '../../src/protocol/types';

/** Who is connecting, as nginx's auth_request established it. */
export interface Identity {
  userId: string;
  meetingId: string;
  name: string;
}

/** What a room needs from a connection. */
export interface RoomClient {
  userId: string;
  name: string;
  send: (message: ServerMessage) => void;
  /** Latest round-trip time the relay measured on this socket, ms (0 until measured). */
  rttMs: () => number;
  close: (code: number, reason: string) => void;
}

/** One snapshot tick of a player, as every client drew it. */
export interface HistoryEntry {
  t: number;
  p: Vec3;
  /** Yaw and pitch, radians. */
  y: number;
  x: number;
  alive: boolean;
  /** Incremented on every respawn: a hit never crosses a respawn. */
  life: number;
}

export interface PoseSample {
  p: Vec3;
  y: number;
  x: number;
  alive: boolean;
  life: number;
}

export interface PlayerState {
  userId: string;
  name: string;
  client: RoomClient;
  spectator: boolean;
  p: Vec3;
  y: number;
  x: number;
  w: number;
  on: boolean;
  combat: CombatState;
  life: number;
  lastPoseAt: number;
  lastShotAt: number;
  /** Rounds of every weapon. */
  ammo: Ammo;
  /** Weapon being reloaded (index), or NO_RELOAD. */
  reloadWeapon: number;
  /** When that reload is done, relay time. */
  reloadDoneAt: number;
  /** When each of the level's pickups is available again to this player (ammo boxes). */
  pickupReadyAt: number[];
  /** Changed since the last snapshot. */
  dirty: boolean;
  history: HistoryEntry[];
}

export interface ShotContext {
  now: number;
  rttMs: number;
  shooter: PlayerState;
  /** Everyone else in the room. */
  others: PlayerState[];
  level: LevelDefinition;
}

export type ShotVerdict =
  | { ok: false; reason: RejectReason }
  | { ok: true; viewTime: number; result: ShotResult };

export interface RoomOptions {
  clock: () => number;
  random?: () => number;
  level?: LevelDefinition;
  maxPlayers?: number;
}

export interface Room {
  key: string;
  join: (client: RoomClient) => void;
  /** Ignored unless `client` is the player's current connection (a replaced socket closing). */
  leave: (userId: string, client: RoomClient) => void;
  handle: (userId: string, message: ClientMessage) => void;
  tick: () => void;
  connectedCount: () => number;
  /** When the last player left, or null while someone is connected. */
  emptySince: () => number | null;
}

export interface RoomRegistry {
  get: (meetingId: string, round: string) => Room;
  tickAll: () => void;
  /** Drops rooms empty for longer than the TTL. */
  sweep: () => void;
  size: () => number;
}

export interface RateLimiter {
  /** Takes a token; false when the socket is over its rate. */
  allow: (now: number) => boolean;
  /** Over the rate continuously for longer than the grace period. */
  abusive: (now: number) => boolean;
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info: (message: string, extra?: Record<string, unknown>) => void;
  warn: (message: string, extra?: Record<string, unknown>) => void;
  error: (message: string, extra?: Record<string, unknown>) => void;
}

export interface RelayServerOptions {
  host: string;
  /** 0 picks a free port (tests). */
  port: number;
  logger: Logger;
  clock?: () => number;
}

export interface RelayServer {
  /** Resolves with the port actually bound. */
  listen: () => Promise<number>;
  close: () => Promise<void>;
}
