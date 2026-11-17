import { describe, expect, it } from 'vitest';
import { createRelayClock } from '../../src/relay-client/clock';
import { CLOCK_SAMPLES } from '../../src/relay-client/constants';

describe('relay clock', () => {
  it('has no estimate before the first pong', () => {
    const clock = createRelayClock();
    expect(clock.relayNow(1000)).toBeNull();
    expect(clock.rtt()).toBeNull();
  });

  it('estimates the relay time from one pong', () => {
    const clock = createRelayClock();
    clock.onPong(1000, 5000, 1100);
    expect(clock.rtt()).toBe(100);
    expect(clock.relayNow(1100)).toBe(5050);
  });

  it('uses the lowest-RTT sample over a later, slower one', () => {
    const clock = createRelayClock();
    clock.onPong(0, 1000, 200);
    clock.onPong(1000, 2000, 1020);
    clock.onPong(2000, 3000, 2300);
    expect(clock.rtt()).toBe(20);
    expect(clock.relayNow(1020)).toBe(2010);
  });

  it('keeps only the last CLOCK_SAMPLES samples', () => {
    const clock = createRelayClock();
    clock.onPong(0, 0, 5);
    for (let i = 1; i < CLOCK_SAMPLES; i += 1) {
      clock.onPong(i * 1000, 0, i * 1000 + 100);
    }
    expect(clock.rtt()).toBe(5);
    clock.onPong(CLOCK_SAMPLES * 1000, 0, CLOCK_SAMPLES * 1000 + 100);
    expect(clock.rtt()).toBe(100);
  });

  it('ignores a pong that arrived before it was sent', () => {
    const clock = createRelayClock();
    clock.onPong(1100, 5000, 1000);
    expect(clock.rtt()).toBeNull();
  });

  it('forgets everything on reset', () => {
    const clock = createRelayClock();
    clock.onPong(1000, 5000, 1100);
    clock.reset();
    expect(clock.relayNow(1100)).toBeNull();
    expect(clock.rtt()).toBeNull();
  });
});
