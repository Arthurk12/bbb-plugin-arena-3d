import { describe, expect, it, vi } from 'vitest';
import { RELAY_LIMITS } from '../../src/protocol/constants';
import { createRoomRegistry } from '../../relay/src/registry';
import { Room } from '../../relay/src/types';

/** A room whose connections and emptiness the test sets by hand. */
const fakeRoom = (key: string) => {
  const state = { connected: 0, emptySince: null as number | null };
  const room: Room & { tick: ReturnType<typeof vi.fn> } = {
    key,
    join: vi.fn(),
    leave: vi.fn(),
    handle: vi.fn(),
    tick: vi.fn(),
    connectedCount: () => state.connected,
    emptySince: () => state.emptySince,
  };
  return { room, state };
};

describe('createRoomRegistry', () => {
  it('gives the same room for the same meeting and round, another one for another round', () => {
    const registry = createRoomRegistry(() => 0);

    expect(registry.get('m1', 'r1')).toBe(registry.get('m1', 'r1'));
    expect(registry.get('m1', 'r2')).not.toBe(registry.get('m1', 'r1'));
    expect(registry.size()).toBe(2);
  });

  it('drops a room only after it has been empty for the TTL', () => {
    let now = 0;
    const made: Record<string, ReturnType<typeof fakeRoom>> = {};
    const registry = createRoomRegistry(() => now, (key) => {
      made[key] = fakeRoom(key);
      return made[key].room;
    });
    registry.get('m1', 'r1');
    registry.get('m1', 'r2');

    // r1 empties at 1000 ms; r2 stays connected.
    made['m1:r2'].state.connected = 1;
    made['m1:r1'].state.emptySince = 1000;

    now = 1000 + RELAY_LIMITS.emptyRoomTtlMs - 1;
    registry.sweep();
    expect(registry.size()).toBe(2);

    now = 1000 + RELAY_LIMITS.emptyRoomTtlMs;
    registry.sweep();
    expect(registry.size()).toBe(1);
    expect(made['m1:r2'].room.emptySince()).toBeNull();
  });

  it('ticks only the rooms that have someone connected', () => {
    const made: Record<string, ReturnType<typeof fakeRoom>> = {};
    const registry = createRoomRegistry(() => 0, (key) => {
      made[key] = fakeRoom(key);
      return made[key].room;
    });
    registry.get('m1', 'busy');
    registry.get('m1', 'idle');
    made['m1:busy'].state.connected = 2;

    registry.tickAll();

    expect(made['m1:busy'].room.tick).toHaveBeenCalledTimes(1);
    expect(made['m1:idle'].room.tick).not.toHaveBeenCalled();
  });
});
