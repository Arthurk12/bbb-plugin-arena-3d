import { PluginApi } from 'bigbluebutton-html-plugin-sdk';
import { Vec3 } from '../commons/types';

/** A hit a player landed on someone, as kept in the shooter's entry. */
export interface WireHit {
  /** Shooter-wide sequence number: each client applies a hit once. */
  n: number;
  /** Target user id. */
  u: string;
  /** Damage. */
  d: number;
}

/**
 * Payload of a `players` data-channel entry: one per user, replaced a few times per second.
 * Keys are short on purpose; every client receives every entry several times per second.
 */
export interface PlayerPayload {
  /** Round the scores belong to. */
  r: string;
  /** Whether the player is in the arena right now (false once they hide it). */
  on: boolean;
  /** Feet position, meters. */
  p: Vec3;
  /** Yaw, radians. */
  y: number;
  /** Pitch, radians. */
  x: number;
  /** Health; 0 means dead. */
  h: number;
  /** Weapon index. */
  w: number;
  /** Shots fired, ever: remote clients play a shot for each increment. */
  s: number;
  /** Sends, ever: makes heartbeats distinct. */
  t: number;
  /** Last hit sequence number used. */
  hn: number;
  /** Deaths this round. */
  dt: number;
  /** Who caused the last death: a user id, or this player's own id for a suicide. */
  lk: string;
  /** Frags this player gave each killer this round: kills are summed from everyone's `kb`. */
  kb: Record<string, number>;
  /** Hits landed in the last few seconds. */
  hits: WireHit[];
}

/** A pose as drawn: feet position, yaw, pitch. */
export interface Pose {
  p: Vec3;
  y: number;
  x: number;
}

export interface Sample {
  /** Local receive time, ms (performance.now clock). */
  t: number;
  pose: Pose;
}

export interface IncomingHit {
  from: string;
  damage: number;
}

export interface RemoteShot {
  userId: string;
  count: number;
}

export interface FragEvent {
  killer: string;
  victim: string;
}

/** What changed between two snapshots of one remote player. */
export interface SnapshotChanges {
  incomingHits: IncomingHit[];
  shots: number;
  frag: FragEvent | null;
  /** Highest hit sequence number seen from this shooter. */
  lastHitSeq: number;
}

export interface NetTiming {
  /** Minimum time between two sends, ms. */
  minSendIntervalMs: number;
  /** Re-send an unchanged payload this often while in the arena, ms. */
  heartbeatMs: number;
  /** How far in the past remote players are drawn, ms. */
  interpolationDelayMs: number;
  /** Players not heard from for this long (no heartbeat) are hidden, ms. */
  staleAfterMs: number;
}

export type PayloadSender = (payload: PlayerPayload) => void;

/**
 * Meeting-wide game state outside React: the game reads it every frame, the data-channel
 * transport writes to it, and React never re-renders on a position update.
 */
export interface GameNet {
  /** Called by the transport; null detaches it. */
  attachSender: (sender: PayloadSender | null) => void;
  setLocalUserId: (userId: string | null) => void;
  getLocalUserId: () => string | null;
  /** The running round, or null without a match. */
  setRound: (round: string | null) => void;
  getRound: () => string | null;
  /** Our own stored entry, handed to the game once so a reload keeps the score. */
  restoreOwn: (snapshot: PlayerPayload) => void;
  takeRestoredOwn: () => PlayerPayload | null;
  /** Called by the game every frame; throttled and deduplicated here. */
  publishLocal: (payload: PlayerPayload, now: number, force?: boolean) => void;
  /** Our latest payload (sent or not). */
  getLocal: () => PlayerPayload | null;
  /** Called by the transport for every changed remote entry. */
  ingest: (userId: string, snapshot: PlayerPayload, now: number) => void;
  /** Drops every user not in the set (left the meeting, entry deleted…). */
  retainUsers: (userIds: Set<string>) => void;
  /** Remote players to draw: in this round, in the arena, heard from recently. */
  activeUserIds: (now: number) => string[];
  /** Every remote player known in this round, in the arena or not (for the scoreboard). */
  roundSnapshots: () => Map<string, PlayerPayload>;
  latest: (userId: string) => PlayerPayload | null;
  /** Interpolated pose of a remote player at `now`, written into `out`. */
  sample: (userId: string, now: number, out: Pose) => Pose | null;
  drainIncomingHits: () => IncomingHit[];
  drainShots: () => RemoteShot[];
  drainFrags: () => FragEvent[];
}

export interface PlayersTransportOptions {
  pluginApi: PluginApi;
  net: GameNet;
  currentUserId: string | null;
  /** Round of the running match; null while no match runs. */
  round: string | null;
  /** Users in the meeting, or null while unknown (then nobody is dropped). */
  presentUserIds: Set<string> | null;
}

export interface PlayersTransport {
  /** Deletes every player entry (moderators, when a match stops). */
  resetPlayers: () => void;
}

/** A hit we landed, with the local time it happened (dropped from the wire after a while). */
export interface LocalHit extends WireHit {
  at: number;
}

export interface Score {
  kills: number;
  deaths: number;
}
