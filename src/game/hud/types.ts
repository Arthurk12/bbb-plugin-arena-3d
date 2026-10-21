import { WeaponId } from '../weapons/types';

export interface FeedItem {
  id: number;
  killer: string;
  victim: string;
  at: number;
}

export interface ScoreRow {
  userId: string;
  kills: number;
  deaths: number;
}

export type HitMarker = 'hit' | 'head';

/** What the HUD shows; written by the game, read by React. Changes only on events. */
export interface HudState {
  locked: boolean;
  health: number;
  alive: boolean;
  weapon: WeaponId;
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
}
