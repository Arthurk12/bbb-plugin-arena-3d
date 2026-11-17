/**
 * Deterministic PRNG (mulberry32): the same seed gives the same sequence on the client and on
 * the relay, so the relay can regenerate a shotgun's pellets instead of trusting them.
 */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
