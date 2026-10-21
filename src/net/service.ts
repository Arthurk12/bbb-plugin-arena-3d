import { Vec3 } from '../commons/types';
import {
  HIT_TTL_MS, MAX_COORDINATE, MAX_COUNTER, MAX_DAMAGE_PER_HIT, MAX_HEALTH, MAX_HITS, MAX_KILLERS,
  MAX_SAMPLES, MAX_USER_ID_LENGTH, MAX_WEAPON_INDEX, NET_TIMING, SEND_THRESHOLD, SNAP_DISTANCE,
  STATE_PRECISION,
} from './constants';
import {
  LocalHit, PlayerPayload, Pose, Sample, Score, SnapshotChanges, WireHit,
} from './types';

const round = (value: number) => Math.round(value * STATE_PRECISION) / STATE_PRECISION;

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isCounter = (value: unknown): value is number => (
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_COUNTER
);

const isUserId = (value: unknown): value is string => (
  typeof value === 'string' && value.length <= MAX_USER_ID_LENGTH
);

const wrapAngle = (angle: number): number => {
  const twoPi = Math.PI * 2;
  return angle - twoPi * Math.floor((angle + Math.PI) / twoPi);
};

/** Rounds what goes on the wire; counters and ids are left alone. */
export const encodePayload = (payload: PlayerPayload): PlayerPayload => ({
  ...payload,
  p: [round(payload.p[0]), round(payload.p[1]), round(payload.p[2])],
  y: round(wrapAngle(payload.y)),
  x: round(payload.x),
});

const sanitizeVec3 = (value: unknown): Vec3 | null => {
  if (!Array.isArray(value) || value.length !== 3) return null;
  if (!value.every((v) => isFiniteNumber(v) && Math.abs(v) <= MAX_COORDINATE)) return null;
  return [value[0], value[1], value[2]];
};

const sanitizeHits = (value: unknown): WireHit[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_HITS).flatMap((hit) => {
    if (!hit || typeof hit !== 'object') return [];
    const { n, u, d } = hit as Record<string, unknown>;
    if (!isCounter(n) || !isUserId(u) || !isFiniteNumber(d)) return [];
    return [{ n, u, d: Math.min(MAX_DAMAGE_PER_HIT, Math.max(0, d)) }];
  });
};

const sanitizeKilledBy = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([killer, count]) => isUserId(killer) && isCounter(count))
      .slice(0, MAX_KILLERS),
  ) as Record<string, number>;
};

/** Validates an entry written by another client; anything unusable is dropped. */
export const sanitizePlayerPayload = (raw: unknown): PlayerPayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const p = sanitizeVec3(value.p);
  if (!p || typeof value.r !== 'string' || !isFiniteNumber(value.y) || !isFiniteNumber(value.x)) {
    return null;
  }
  const health = isFiniteNumber(value.h) ? Math.round(value.h) : 0;
  return {
    r: value.r,
    on: value.on === true,
    p,
    y: value.y,
    x: value.x,
    h: Math.min(MAX_HEALTH, Math.max(0, health)),
    w: isCounter(value.w) && value.w <= MAX_WEAPON_INDEX ? value.w : 0,
    s: isCounter(value.s) ? value.s : 0,
    t: isCounter(value.t) ? value.t : 0,
    hn: isCounter(value.hn) ? value.hn : 0,
    dt: isCounter(value.dt) ? value.dt : 0,
    lk: isUserId(value.lk) ? value.lk : '',
    kb: sanitizeKilledBy(value.kb),
    hits: sanitizeHits(value.hits),
  };
};

const posesDiffer = (a: PlayerPayload, b: PlayerPayload): boolean => (
  Math.abs(a.p[0] - b.p[0]) >= SEND_THRESHOLD.position
  || Math.abs(a.p[1] - b.p[1]) >= SEND_THRESHOLD.position
  || Math.abs(a.p[2] - b.p[2]) >= SEND_THRESHOLD.position
  || Math.abs(wrapAngle(a.y - b.y)) >= SEND_THRESHOLD.rotation
  || Math.abs(a.x - b.x) >= SEND_THRESHOLD.rotation
);

const lastHitSeqOf = (hits: WireHit[]): number => (
  hits.reduce((max, hit) => Math.max(max, hit.n), 0)
);

const killedByEqual = (a: Record<string, number>, b: Record<string, number>): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

/** Whether a payload carries anything the last sent one did not (`t` excluded). */
export const hasMeaningfulChange = (
  previous: PlayerPayload | null,
  next: PlayerPayload,
): boolean => {
  if (!previous) return true;
  return posesDiffer(previous, next)
    || previous.r !== next.r
    || previous.on !== next.on
    || previous.h !== next.h
    || previous.w !== next.w
    || previous.s !== next.s
    || previous.hn !== next.hn
    || previous.dt !== next.dt
    || previous.lk !== next.lk
    || previous.hits.length !== next.hits.length
    || lastHitSeqOf(previous.hits) !== lastHitSeqOf(next.hits)
    || !killedByEqual(previous.kb, next.kb);
};

/** Our hits still worth sending: recent ones, newest last, without the local timestamp. */
export const recentHits = (hits: LocalHit[], now: number): LocalHit[] => (
  hits.filter((hit) => now - hit.at <= HIT_TTL_MS).slice(-MAX_HITS)
);

export const toWireHits = (hits: LocalHit[]): WireHit[] => (
  hits.map(({ n, u, d }) => ({ n, u, d }))
);

/**
 * What a remote player's new snapshot means for us. The first snapshot of a player (or of a
 * new round) only sets the baseline: hits already in it happened before we were watching.
 */
export const diffSnapshots = (
  userId: string,
  previous: PlayerPayload | null,
  next: PlayerPayload,
  localUserId: string | null,
  lastHitSeq: number,
): SnapshotChanges => {
  const newestSeq = Math.max(lastHitSeqOf(next.hits), next.hn);
  if (!previous || previous.r !== next.r) {
    return {
      incomingHits: [], shots: 0, frag: null, lastHitSeq: newestSeq,
    };
  }
  const incomingHits = localUserId
    ? next.hits
      .filter((hit) => hit.u === localUserId && hit.n > lastHitSeq)
      .map((hit) => ({ from: userId, damage: hit.d }))
    : [];
  return {
    incomingHits,
    shots: Math.max(0, next.s - previous.s),
    frag: next.dt > previous.dt ? { killer: next.lk || userId, victim: userId } : null,
    lastHitSeq: Math.max(lastHitSeq, newestSeq),
  };
};

const copyPose = (from: Pose, out: Pose): Pose => {
  out.p[0] = from.p[0];
  out.p[1] = from.p[1];
  out.p[2] = from.p[2];
  out.y = from.y;
  out.x = from.x;
  return out;
};

const distance = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Appends a sample. After a pause (an idle player sends nothing) the previous pose is repeated
 * one send interval earlier, so movement blends from where it started instead of jumping.
 */
export const pushSample = (buffer: Sample[], sample: Sample): void => {
  const last = buffer[buffer.length - 1];
  const resumeAt = sample.t - NET_TIMING.minSendIntervalMs;
  if (last && resumeAt > last.t) buffer.push({ t: resumeAt, pose: last.pose });
  buffer.push(sample);
  if (buffer.length > MAX_SAMPLES) buffer.splice(0, buffer.length - MAX_SAMPLES);
};

/** Pose at `renderTime`, blended between the two samples around it. */
export const sampleBuffer = (buffer: Sample[], renderTime: number, out: Pose): Pose | null => {
  if (!buffer.length) return null;
  if (renderTime <= buffer[0].t) return copyPose(buffer[0].pose, out);
  for (let i = buffer.length - 2; i >= 0; i -= 1) {
    const a = buffer[i];
    const b = buffer[i + 1];
    if (renderTime >= a.t && renderTime < b.t) {
      if (distance(a.pose.p, b.pose.p) > SNAP_DISTANCE) return copyPose(a.pose, out);
      const alpha = (renderTime - a.t) / (b.t - a.t);
      out.p[0] = a.pose.p[0] + (b.pose.p[0] - a.pose.p[0]) * alpha;
      out.p[1] = a.pose.p[1] + (b.pose.p[1] - a.pose.p[1]) * alpha;
      out.p[2] = a.pose.p[2] + (b.pose.p[2] - a.pose.p[2]) * alpha;
      out.y = a.pose.y + wrapAngle(b.pose.y - a.pose.y) * alpha;
      out.x = a.pose.x + (b.pose.x - a.pose.x) * alpha;
      return out;
    }
  }
  return copyPose(buffer[buffer.length - 1].pose, out);
};

/**
 * Kills and deaths of everyone in the round. Each victim records who fragged them, so the
 * score survives the killer reloading and every client computes the same table.
 */
export const computeScores = (snapshots: Iterable<[string, PlayerPayload]>): Map<string, Score> => {
  const scores = new Map<string, Score>();
  const scoreOf = (userId: string) => {
    let score = scores.get(userId);
    if (!score) {
      score = { kills: 0, deaths: 0 };
      scores.set(userId, score);
    }
    return score;
  };
  [...snapshots].forEach(([userId, snapshot]) => {
    scoreOf(userId).deaths += snapshot.dt;
    Object.entries(snapshot.kb).forEach(([killer, count]) => {
      if (killer !== userId) scoreOf(killer).kills += count;
    });
  });
  return scores;
};
