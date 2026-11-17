import { describe, expect, it } from 'vitest';
import { createSnapshotStore } from '../../src/relay-client/snapshots';
import { SNAPSHOT_FLAGS } from '../../src/protocol/constants';
import { SnapshotEntry, SnapshotMessage } from '../../src/protocol/types';
import { Pose } from '../../src/net/types';

const ALIVE_IN_ARENA = SNAPSHOT_FLAGS.ALIVE | SNAPSHOT_FLAGS.IN_ARENA;

const entry = (
  id: string,
  x: number,
  flags = ALIVE_IN_ARENA,
  yaw = 0,
): SnapshotEntry => [id, x, 0, 0, yaw, 0, 0, flags];

const snap = (t: number, ...players: SnapshotEntry[]): SnapshotMessage => ({
  type: 'snap',
  t,
  players,
});

const newPose = (): Pose => ({ p: [0, 0, 0], y: 0, x: 0 });

describe('relay snapshot store', () => {
  it('blends halfway between two snapshots 50 ms apart', () => {
    const store = createSnapshotStore();
    store.apply(snap(0, entry('a', 0)));
    store.apply(snap(50, entry('a', 1)));
    const out = store.sample('a', 25, newPose());
    expect(out?.p[0]).toBeCloseTo(0.5);
  });

  it('returns the first pose before the first snapshot and the last after it', () => {
    const store = createSnapshotStore();
    store.apply(snap(0, entry('a', 0)));
    store.apply(snap(50, entry('a', 1)));
    expect(store.sample('a', -10, newPose())?.p[0]).toBe(0);
    expect(store.sample('a', 500, newPose())?.p[0]).toBe(1);
  });

  it('blends yaw across the wrap at pi', () => {
    const store = createSnapshotStore();
    store.apply(snap(0, entry('a', 0, ALIVE_IN_ARENA, Math.PI - 0.1)));
    store.apply(snap(50, entry('a', 0, ALIVE_IN_ARENA, -Math.PI + 0.1)));
    const out = store.sample('a', 25, newPose());
    expect(Math.cos(out?.y ?? 0)).toBeCloseTo(-1);
  });

  it('does not blend across a teleport (more than 6 m apart)', () => {
    const store = createSnapshotStore();
    store.apply(snap(0, entry('a', 0)));
    store.apply(snap(50, entry('a', 10)));
    expect(store.sample('a', 25, newPose())?.p[0]).toBe(0);
  });

  it('blends a move of less than 6 m', () => {
    const store = createSnapshotStore();
    store.apply(snap(0, entry('a', 0)));
    store.apply(snap(50, entry('a', 5)));
    expect(store.sample('a', 25, newPose())?.p[0]).toBeCloseTo(2.5);
  });

  it('decodes the alive and in-arena flags', () => {
    const store = createSnapshotStore();
    store.apply(snap(0, entry('both', 0, ALIVE_IN_ARENA)));
    store.apply(snap(0, entry('alive', 0, SNAPSHOT_FLAGS.ALIVE)));
    store.apply(snap(0, entry('none', 0, 0)));
    expect(store.latest('both')).toMatchObject({ alive: true, on: true });
    expect(store.latest('alive')).toMatchObject({ alive: true, on: false });
    expect(store.latest('none')).toMatchObject({ alive: false, on: false });
  });

  it('inserts a resume sample so a move after an idle gap starts from where the player stood', () => {
    const store = createSnapshotStore();
    store.apply(snap(0, entry('a', 0)));
    store.apply(snap(1000, entry('a', 0)));
    store.apply(snap(1050, entry('a', 1)));
    expect(store.sample('a', 1000, newPose())?.p[0]).toBe(0);
    expect(store.sample('a', 500, newPose())?.p[0]).toBe(0);
    expect(store.sample('a', 1025, newPose())?.p[0]).toBeCloseTo(0.5);
  });

  it('ignores a snapshot that is not newer than the last one', () => {
    const store = createSnapshotStore();
    store.apply(snap(100, entry('a', 0)));
    store.apply(snap(100, entry('a', 9)));
    store.apply(snap(50, entry('a', 9)));
    expect(store.latest('a')?.t).toBe(100);
    expect(store.latest('a')?.pose.p[0]).toBe(0);
  });

  it('returns null for an unknown player', () => {
    const store = createSnapshotStore();
    expect(store.sample('nobody', 0, newPose())).toBeNull();
    expect(store.latest('nobody')).toBeNull();
  });

  it('removes one player, clears all, and lists the rest', () => {
    const store = createSnapshotStore();
    store.apply(snap(0, entry('a', 0), entry('b', 0)));
    expect(store.userIds().sort()).toEqual(['a', 'b']);
    store.remove('a');
    expect(store.userIds()).toEqual(['b']);
    expect(store.latest('a')).toBeNull();
    store.clear();
    expect(store.userIds()).toEqual([]);
  });
});
