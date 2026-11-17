import { wrapAngle } from '../../src/commons/utils';
import { HISTORY_LENGTH } from './constants';
import { HistoryEntry, PoseSample } from './types';

/**
 * Keeps the last few ticks of a player so a shot can be checked against where the target was
 * when the shooter aimed, not where it is now.
 */
export const recordHistory = (
  history: HistoryEntry[],
  entry: HistoryEntry,
  max = HISTORY_LENGTH,
): void => {
  history.push(entry);
  while (history.length > max) {
    history.shift();
  }
};

/**
 * Pose of a player at relay time `t` (position and aim), blended between the two ticks around
 * it. Never blends across a respawn (the body teleported): the earlier tick is used as is.
 * Always returns fresh data, so the caller cannot corrupt the stored history.
 */
export const sampleHistory = (history: HistoryEntry[], t: number): PoseSample | null => {
  if (history.length === 0) {
    return null;
  }

  const first = history[0];
  const last = history[history.length - 1];
  if (t <= first.t) {
    return { p: [...first.p], y: first.y, x: first.x, alive: first.alive, life: first.life };
  }
  if (t >= last.t) {
    return { p: [...last.p], y: last.y, x: last.x, alive: last.alive, life: last.life };
  }

  let i = 0;
  while (history[i + 1].t <= t) {
    i += 1;
  }
  const a = history[i];
  const b = history[i + 1];

  if (a.life !== b.life) {
    return { p: [...a.p], y: a.y, x: a.x, alive: a.alive, life: a.life };
  }

  const alpha = (t - a.t) / (b.t - a.t);
  return {
    p: [
      a.p[0] + (b.p[0] - a.p[0]) * alpha,
      a.p[1] + (b.p[1] - a.p[1]) * alpha,
      a.p[2] + (b.p[2] - a.p[2]) * alpha,
    ],
    y: a.y + wrapAngle(b.y - a.y) * alpha,
    x: a.x + (b.x - a.x) * alpha,
    alive: a.alive,
    life: a.life,
  };
};
