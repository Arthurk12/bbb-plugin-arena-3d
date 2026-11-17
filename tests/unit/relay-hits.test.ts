import { describe, expect, it } from 'vitest';
import { effectiveViewTime } from '../../relay/src/hits';

describe('effectiveViewTime', () => {
  // With an RTT of 40 ms, a view time is expected 20 + 100 ms behind now: 880 at now = 1000.
  it('keeps a view time consistent with the measured RTT', () => {
    expect(effectiveViewTime(880, 1000, 40)).toBe(880);
    expect(effectiveViewTime(900, 1000, 40)).toBe(900);
  });

  it('replaces a view time that the RTT does not explain with the expected one', () => {
    expect(effectiveViewTime(500, 1000, 40)).toBe(880);
  });

  it('replaces a view time from the future with the expected one', () => {
    // RTT 0 expects 900; 1001 is in the future and 101 ms away from that.
    expect(effectiveViewTime(1001, 1000, 0)).toBe(900);
  });

  it('never goes further back than the maximum rewind', () => {
    // RTT 400 expects 700, which is older than now - 200 = 800; the vt is consistent with it.
    expect(effectiveViewTime(650, 1000, 400)).toBe(800);
    expect(effectiveViewTime(700, 1000, 400)).toBe(800);
  });
});
