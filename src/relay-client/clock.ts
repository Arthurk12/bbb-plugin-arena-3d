import { CLOCK_SAMPLES } from './constants';
import { RelayClock } from './types';

interface ClockSample {
  /** Relay time minus local time, ms. */
  offset: number;
  rtt: number;
}

/**
 * Maps the local clock to the relay's clock. Each pong gives one estimate; the one with the
 * lowest round trip is the most trustworthy, since its delay is the least uncertain.
 */
export const createRelayClock = (): RelayClock => {
  let samples: ClockSample[] = [];

  const best = (): ClockSample | null => samples.reduce<ClockSample | null>(
    // On a tie the newer sample wins: it is the one that tracks the current clock drift.
    (lowest, sample) => (!lowest || sample.rtt <= lowest.rtt ? sample : lowest),
    null,
  );

  return {
    onPong: (sentAt, relayTime, receivedAt) => {
      const rtt = receivedAt - sentAt;
      if (rtt < 0) return;
      // Assumes the trip is symmetric: the relay stamped its time halfway through the round trip.
      const offset = relayTime + rtt / 2 - receivedAt;
      samples.push({ offset, rtt });
      if (samples.length > CLOCK_SAMPLES) samples.splice(0, samples.length - CLOCK_SAMPLES);
    },
    relayNow: (localNow) => {
      const sample = best();
      return sample ? localNow + sample.offset : null;
    },
    rtt: () => best()?.rtt ?? null,
    reset: () => {
      samples = [];
    },
  };
};
