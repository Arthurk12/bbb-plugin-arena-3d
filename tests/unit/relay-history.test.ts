import { describe, expect, it } from 'vitest';
import { recordHistory, sampleHistory } from '../../relay/src/history';
import { HistoryEntry } from '../../relay/src/types';

const entry = (
  t: number,
  p: [number, number, number],
  life = 1,
  alive = true,
  y = 0,
  x = 0,
): HistoryEntry => ({
  t, p, y, x, alive, life,
});

describe('recordHistory', () => {
  it('keeps at most max entries and drops the oldest', () => {
    const history: HistoryEntry[] = [];
    for (let t = 0; t < 10; t += 1) {
      recordHistory(history, entry(t, [t, 0, 0]), 4);
    }
    expect(history.map((h) => h.t)).toEqual([6, 7, 8, 9]);
  });
});

describe('sampleHistory', () => {
  it('returns null when there is no history', () => {
    expect(sampleHistory([], 100)).toBeNull();
  });

  it('returns the first entry before the history starts', () => {
    const history = [entry(100, [1, 0, 0]), entry(150, [2, 0, 0])];
    expect(sampleHistory(history, 50)).toEqual({ p: [1, 0, 0], y: 0, x: 0, alive: true, life: 1 });
  });

  it('returns the last entry after the history ends', () => {
    const history = [entry(100, [1, 0, 0]), entry(150, [2, 0, 0])];
    expect(sampleHistory(history, 200)).toEqual({ p: [2, 0, 0], y: 0, x: 0, alive: true, life: 1 });
  });

  it('blends linearly between two entries of the same life', () => {
    const history = [entry(100, [0, 0, 0]), entry(150, [10, 2, -4])];
    const sample = sampleHistory(history, 125);
    expect(sample?.p[0]).toBeCloseTo(5);
    expect(sample?.p[1]).toBeCloseTo(1);
    expect(sample?.p[2]).toBeCloseTo(-2);
    expect(sample?.life).toBe(1);
    expect(sample?.alive).toBe(true);
  });

  it('blends the yaw the short way round and the pitch linearly', () => {
    const history = [entry(100, [0, 0, 0], 1, true, 3, 0), entry(150, [0, 0, 0], 1, true, -3, 0.4)];
    const sample = sampleHistory(history, 125);
    expect(Math.cos(sample!.y)).toBeCloseTo(-1);
    expect(sample?.x).toBeCloseTo(0.2);
  });

  it('returns the earlier entry without blending across a life change', () => {
    const history = [entry(100, [0, 0, 0], 1), entry(150, [10, 0, 0], 2)];
    expect(sampleHistory(history, 125)).toEqual({ p: [0, 0, 0], y: 0, x: 0, alive: true, life: 1 });
  });

  it('returns fresh arrays, not the stored ones', () => {
    const history = [entry(100, [1, 2, 3]), entry(150, [4, 5, 6])];

    const first = sampleHistory(history, 50);
    first?.p.splice(0, 3, 9, 9, 9);
    expect(history[0].p).toEqual([1, 2, 3]);

    const last = sampleHistory(history, 200);
    last?.p.splice(0, 3, 9, 9, 9);
    expect(history[1].p).toEqual([4, 5, 6]);

    const middle = sampleHistory(history, 125);
    middle?.p.splice(0, 3, 9, 9, 9);
    expect(history[0].p).toEqual([1, 2, 3]);
    expect(history[1].p).toEqual([4, 5, 6]);
  });
});
