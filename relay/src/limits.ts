import { RATE_RECOVERY_SHARE } from './constants';
import { RateLimiter } from './types';

/**
 * Token bucket per socket: a burst up to `maxPerSecond` is fine, a sustained flood is not.
 * Going over is not an immediate disconnect; only staying over for `graceMs` is, so a short
 * stutter in the client does not cost the player their connection.
 */
export const createRateLimiter = (maxPerSecond: number, graceMs: number): RateLimiter => {
  let tokens = maxPerSecond;
  let last: number | null = null;
  let overSince: number | null = null;

  return {
    allow: (now) => {
      if (last !== null) {
        tokens = Math.min(maxPerSecond, tokens + ((now - last) * maxPerSecond) / 1000);
      }
      last = now;
      // A flood keeps the bucket near empty, so some messages still pass: only slowing down
      // enough to refill half of it ends the abuse window.
      if (tokens >= maxPerSecond * RATE_RECOVERY_SHARE) {
        overSince = null;
      }
      if (tokens >= 1) {
        tokens -= 1;
        return true;
      }
      if (overSince === null) {
        overSince = now;
      }
      return false;
    },
    abusive: (now) => overSince !== null && now - overSince >= graceMs,
  };
};
