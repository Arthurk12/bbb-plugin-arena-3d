import { describe, expect, it } from 'vitest';
import {
  computeScores, diffSnapshots, encodePayload, hasMeaningfulChange, pushSample, recentHits,
  sampleBuffer, sanitizePlayerPayload,
} from '../../src/net/service';
import { HIT_TTL_MS, MAX_COUNTER, MAX_HITS } from '../../src/net/constants';
import { PlayerPayload, Pose, Sample } from '../../src/net/types';

const payload = (overrides: Partial<PlayerPayload> = {}): PlayerPayload => ({
  r: 'round1',
  on: true,
  p: [0, 0, 0],
  y: 0,
  x: 0,
  h: 100,
  w: 0,
  s: 0,
  t: 0,
  hn: 0,
  dt: 0,
  lk: '',
  kb: {},
  hits: [],
  ...overrides,
});

const pose = (): Pose => ({ p: [0, 0, 0], y: 0, x: 0 });

describe('sanitizePlayerPayload', () => {
  it('accepts a well-formed payload', () => {
    expect(sanitizePlayerPayload(payload({ p: [1, 2, 3] }))).toEqual(payload({ p: [1, 2, 3] }));
  });

  it('rejects payloads without a usable pose or round', () => {
    expect(sanitizePlayerPayload(null)).toBeNull();
    expect(sanitizePlayerPayload({ ...payload(), p: [1, 2] })).toBeNull();
    expect(sanitizePlayerPayload({ ...payload(), p: [1e6, 0, 0] })).toBeNull();
    expect(sanitizePlayerPayload({ ...payload(), r: 3 })).toBeNull();
    expect(sanitizePlayerPayload({ ...payload(), y: 'north' })).toBeNull();
  });

  it('clamps health and damage, and drops malformed hits and killers', () => {
    const value = sanitizePlayerPayload({
      ...payload(),
      h: 500,
      w: 99,
      kb: { u1: 2, u2: -1, u3: 'x' },
      hits: [{ n: 1, u: 'u1', d: 9999 }, { n: -1, u: 'u2', d: 5 }, 'junk'],
    });
    expect(value?.h).toBe(100);
    expect(value?.w).toBe(0);
    expect(value?.kb).toEqual({ u1: 2 });
    expect(value?.hits).toEqual([{ n: 1, u: 'u1', d: 200 }]);
  });

  it('caps the number of hits', () => {
    const hits = Array.from({ length: MAX_HITS + 5 }, (_, i) => ({ n: i + 1, u: 'u', d: 1 }));
    expect(sanitizePlayerPayload({ ...payload(), hits })?.hits).toHaveLength(MAX_HITS);
  });
});

describe('encodePayload', () => {
  it('rounds coordinates and angles to two decimals', () => {
    const encoded = encodePayload(payload({ p: [1.23456, 0.001, -2.555555], y: 0.123456 }));
    expect(encoded.p).toEqual([1.23, 0, -2.56]);
    expect(encoded.y).toBe(0.12);
  });

  it('only produces integers that akka-apps accepts', () => {
    const encoded = encodePayload(payload({ s: MAX_COUNTER }));
    expect(Number.isInteger(encoded.s) && encoded.s <= MAX_COUNTER).toBe(true);
  });
});

describe('hasMeaningfulChange', () => {
  it('ignores sub-centimeter jitter but sends gameplay changes', () => {
    const base = payload();
    expect(hasMeaningfulChange(null, base)).toBe(true);
    expect(hasMeaningfulChange(base, payload({ p: [0.01, 0, 0] }))).toBe(false);
    expect(hasMeaningfulChange(base, payload({ p: [0.5, 0, 0] }))).toBe(true);
    expect(hasMeaningfulChange(base, payload({ h: 90 }))).toBe(true);
    expect(hasMeaningfulChange(base, payload({ s: 1 }))).toBe(true);
    expect(hasMeaningfulChange(base, payload({ kb: { u1: 1 } }))).toBe(true);
    expect(hasMeaningfulChange(base, payload({ t: 5 }))).toBe(false);
  });
});

describe('recentHits', () => {
  it('drops hits older than their time to live', () => {
    const hits = [{
      n: 1, u: 'a', d: 1, at: 0,
    }, {
      n: 2, u: 'a', d: 1, at: 1000,
    }];
    expect(recentHits(hits, HIT_TTL_MS + 500).map((hit) => hit.n)).toEqual([2]);
  });
});

describe('diffSnapshots', () => {
  it('takes the first snapshot as the baseline, without applying old hits', () => {
    const next = payload({ hits: [{ n: 4, u: 'me', d: 20 }], hn: 4 });
    const changes = diffSnapshots('shooter', null, next, 'me', 0);
    expect(changes.incomingHits).toEqual([]);
    expect(changes.lastHitSeq).toBe(4);
  });

  it('applies each new hit addressed to us exactly once', () => {
    const previous = payload({ hits: [{ n: 4, u: 'me', d: 20 }], hn: 4 });
    const next = payload({
      hits: [{ n: 4, u: 'me', d: 20 }, { n: 5, u: 'other', d: 10 }, { n: 6, u: 'me', d: 30 }],
      hn: 6,
    });
    const changes = diffSnapshots('shooter', previous, next, 'me', 4);
    expect(changes.incomingHits).toEqual([{ from: 'shooter', damage: 30 }]);
    expect(changes.lastHitSeq).toBe(6);
    const again = diffSnapshots('shooter', next, next, 'me', changes.lastHitSeq);
    expect(again.incomingHits).toEqual([]);
  });

  it('reports shots fired and deaths', () => {
    const changes = diffSnapshots(
      'victim',
      payload({ s: 3, dt: 1 }),
      payload({ s: 5, dt: 2, lk: 'killer' }),
      'me',
      0,
    );
    expect(changes.shots).toBe(2);
    expect(changes.frag).toEqual({ killer: 'killer', victim: 'victim' });
  });

  it('starts over when the round changes', () => {
    const changes = diffSnapshots(
      'victim',
      payload({ dt: 4 }),
      payload({ r: 'round2', dt: 0, hits: [{ n: 9, u: 'me', d: 50 }] }),
      'me',
      0,
    );
    expect(changes.incomingHits).toEqual([]);
    expect(changes.frag).toBeNull();
  });
});

describe('interpolation', () => {
  it('blends between the samples around the render time', () => {
    const buffer: Sample[] = [];
    pushSample(buffer, { t: 0, pose: { p: [0, 0, 0], y: 0, x: 0 } });
    pushSample(buffer, { t: 250, pose: { p: [2, 0, 0], y: 0, x: 0 } });
    expect(sampleBuffer(buffer, 125, pose())?.p[0]).toBeCloseTo(1);
    expect(sampleBuffer(buffer, 1000, pose())?.p[0]).toBe(2);
    expect(sampleBuffer(buffer, -50, pose())?.p[0]).toBe(0);
  });

  it('turns through the shortest way around', () => {
    const buffer: Sample[] = [];
    pushSample(buffer, { t: 0, pose: { p: [0, 0, 0], y: 3, x: 0 } });
    pushSample(buffer, { t: 100, pose: { p: [0, 0, 0], y: -3, x: 0 } });
    const yaw = sampleBuffer(buffer, 50, pose())!.y;
    expect(Math.abs(yaw)).toBeGreaterThan(3);
  });

  it('does not blend across a teleport (respawn)', () => {
    const buffer: Sample[] = [];
    pushSample(buffer, { t: 0, pose: { p: [0, 0, 0], y: 0, x: 0 } });
    pushSample(buffer, { t: 100, pose: { p: [30, 0, 0], y: 0, x: 0 } });
    expect(sampleBuffer(buffer, 50, pose())?.p[0]).toBe(0);
  });

  it('starts moving from where an idle player stood, not from long ago', () => {
    const buffer: Sample[] = [];
    pushSample(buffer, { t: 0, pose: { p: [0, 0, 0], y: 0, x: 0 } });
    pushSample(buffer, { t: 10000, pose: { p: [1, 0, 0], y: 0, x: 0 } });
    expect(sampleBuffer(buffer, 9000, pose())?.p[0]).toBe(0);
  });
});

describe('computeScores', () => {
  it('sums kills from every victim and ignores suicides', () => {
    const scores = computeScores([
      ['a', payload({ dt: 2, kb: { b: 1, a: 1 } })],
      ['b', payload({ dt: 1, kb: { a: 1 } })],
      ['c', payload({ dt: 0 })],
    ]);
    expect(scores.get('a')).toEqual({ kills: 1, deaths: 2 });
    expect(scores.get('b')).toEqual({ kills: 1, deaths: 1 });
    expect(scores.get('c')).toEqual({ kills: 0, deaths: 0 });
  });
});
