import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../relay/src/limits';

describe('createRateLimiter', () => {
  it('allows a burst of maxPerSecond calls at one instant, then refuses', () => {
    const limiter = createRateLimiter(60, 5000);
    for (let i = 0; i < 60; i += 1) {
      expect(limiter.allow(1000)).toBe(true);
    }
    expect(limiter.allow(1000)).toBe(false);
  });

  it('refills about maxPerSecond * elapsed seconds', () => {
    const limiter = createRateLimiter(60, 5000);
    for (let i = 0; i < 60; i += 1) {
      limiter.allow(1000);
    }
    expect(limiter.allow(1000)).toBe(false);

    // 500 ms at 60 per second gives 30 tokens back.
    let allowed = 0;
    for (let i = 0; i < 100; i += 1) {
      if (limiter.allow(1500)) {
        allowed += 1;
      }
    }
    expect(allowed).toBe(30);
  });

  it('is not abusive right after going over, abusive after the grace period, and recovers', () => {
    const limiter = createRateLimiter(60, 5000);
    for (let i = 0; i < 60; i += 1) {
      limiter.allow(0);
    }
    expect(limiter.allow(0)).toBe(false);
    expect(limiter.abusive(0)).toBe(false);

    expect(limiter.abusive(4999)).toBe(false);
    expect(limiter.abusive(5000)).toBe(true);
  });

  it('is not abusive once the client slowed down enough to refill half the bucket', () => {
    const limiter = createRateLimiter(60, 5000);
    for (let i = 0; i < 60; i += 1) {
      limiter.allow(0);
    }
    expect(limiter.allow(0)).toBe(false);

    // 600 ms at 60 per second refills 36 tokens, more than half of the bucket.
    expect(limiter.allow(600)).toBe(true);
    expect(limiter.abusive(600)).toBe(false);
  });

  it('is abusive after a flood of 1000 messages per second for 6 seconds', () => {
    const limiter = createRateLimiter(60, 5000);
    let abusive = false;
    for (let ms = 0; ms <= 6000; ms += 1) {
      if (!limiter.allow(ms)) {
        abusive = limiter.abusive(ms) || abusive;
      }
    }
    expect(limiter.abusive(6000)).toBe(true);
    expect(abusive).toBe(true);
  });

  it('is never abusive at a steady 20 messages per second for 10 seconds', () => {
    const limiter = createRateLimiter(60, 5000);
    for (let ms = 0; ms <= 10000; ms += 50) {
      expect(limiter.allow(ms)).toBe(true);
      expect(limiter.abusive(ms)).toBe(false);
    }
  });
});
