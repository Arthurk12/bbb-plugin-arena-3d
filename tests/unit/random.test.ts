import { describe, expect, it } from 'vitest';
import { seededRandom } from '../../src/commons/random';

const take = (next: () => number, count: number): number[] =>
  Array.from({ length: count }, () => next());

describe('seededRandom', () => {
  it('gives the same sequence for the same seed', () => {
    expect(take(seededRandom(12345), 20)).toEqual(take(seededRandom(12345), 20));
  });

  it('gives different first values for different seeds', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });

  it('returns values in [0, 1)', () => {
    const values = take(seededRandom(987654321), 10000);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
