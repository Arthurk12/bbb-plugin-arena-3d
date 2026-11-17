import { ConnectionStatus } from '../../relay-client/types';
import { WeaponId } from '../weapons/types';

export interface Score {
  kills: number;
  deaths: number;
}

/** The relay connection as the HUD shows it; `idle` while no match runs. */
export type ConnectionState = ConnectionStatus | 'idle';

export interface FeedItem {
  id: number;
  killer: string;
  victim: string;
  /** Weapon of the frag (not shown for a suicide). */
  weapon: WeaponId;
  /** The killing hit was to the head. */
  headshot: boolean;
  at: number;
}

export interface ScoreRow {
  userId: string;
  kills: number;
  deaths: number;
}

/** How a hit we landed is shown: the head stands out, arms and legs are a lighter hit. */
export type HitMarker = 'head' | 'body' | 'limb';

/** What the HUD shows; written by the game, read by React. Changes only on events. */
export interface HudState {
  locked: boolean;
  health: number;
  alive: boolean;
  weapon: WeaponId;
  /** Looking through a scope: its lens fills the screen. */
  scoped: boolean;
  /** Rounds of the weapon in hand: in the magazine and in reserve. */
  mag: number;
  reserve: number;
  reloading: boolean;
  /** The magazine is nearly empty. */
  lowAmmo: boolean;
  kills: number;
  deaths: number;
  /** Who caused our last death; equals our id for a suicide. */
  killer: string;
  respawnIn: number; // seconds
  feed: FeedItem[];
  scoreboard: ScoreRow[];
  showScoreboard: boolean;
  hitMarker: HitMarker;
  /** Bumped on every hit we land, to replay the marker animation. */
  hitMarkerSeq: number;
  /** Bumped every time we take damage, to replay the red flash. */
  damageSeq: number;
  muted: boolean;
  /** The browser could not start WebGL. */
  webglError: boolean;
  /** The relay connection, for the "connecting…" notice. */
  connection: ConnectionState;
}
