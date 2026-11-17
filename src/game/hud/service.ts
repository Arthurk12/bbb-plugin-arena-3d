import { DEFAULT_WEAPON, WEAPONS } from '../weapons/constants';
import { MAX_HEALTH } from '../../net/constants';
import { HitZone } from '../hitbox/types';
import { FEED_SIZE, FEED_TTL_MS } from './constants';
import {
  FeedItem, HitMarker, HudState, Score, ScoreRow,
} from './types';

export const initialHudState = (): HudState => ({
  locked: false,
  health: MAX_HEALTH,
  alive: true,
  weapon: DEFAULT_WEAPON,
  scoped: false,
  mag: WEAPONS[DEFAULT_WEAPON].ammo.magazine,
  reserve: WEAPONS[DEFAULT_WEAPON].ammo.startReserve,
  reloading: false,
  lowAmmo: false,
  kills: 0,
  deaths: 0,
  killer: '',
  respawnIn: 0,
  feed: [],
  scoreboard: [],
  showScoreboard: false,
  hitMarker: 'body',
  hitMarkerSeq: 0,
  damageSeq: 0,
  muted: false,
  webglError: false,
  connection: 'idle',
});

/** Best first: most kills, then fewest deaths, then a stable order. */
export const scoreboardRows = (scores: Map<string, Score>): ScoreRow[] => (
  [...scores.entries()]
    .map(([userId, score]) => ({ userId, kills: score.kills, deaths: score.deaths }))
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.userId.localeCompare(b.userId))
);

export const sameRows = (a: ScoreRow[], b: ScoreRow[]): boolean => (
  a.length === b.length && a.every((row, i) => (
    row.userId === b[i].userId && row.kills === b[i].kills && row.deaths === b[i].deaths
  ))
);

export const appendFeed = (feed: FeedItem[], item: FeedItem): FeedItem[] => (
  [...feed, item].slice(-FEED_SIZE)
);

export const pruneFeed = (feed: FeedItem[], now: number): FeedItem[] => {
  const kept = feed.filter((item) => now - item.at < FEED_TTL_MS);
  return kept.length === feed.length ? feed : kept;
};

/** Marker for a hit we landed in `zone` (null: no zone, shown as a body hit). */
export const hitMarkerFor = (zone: HitZone | null): HitMarker => {
  if (zone === 'head') return 'head';
  if (zone === 'arms' || zone === 'legs') return 'limb';
  return 'body';
};
