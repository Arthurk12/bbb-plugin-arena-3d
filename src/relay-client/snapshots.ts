import { Pose, Vec3 } from '../commons/types';
import { wrapAngle } from '../commons/utils';
import { RELAY_TIMING, SNAPSHOT_FLAGS } from '../protocol/constants';
import { SnapshotMessage } from '../protocol/types';
import { SNAP_DISTANCE, SNAPSHOT_BUFFER_LENGTH } from './constants';
import {
  RemoteState, SnapshotStore, TimedPose,
} from './types';

interface Track {
  buffer: TimedPose[];
  latest: RemoteState;
}

const copyPose = (from: Pose, out: Pose): Pose => {
  out.p[0] = from.p[0];
  out.p[1] = from.p[1];
  out.p[2] = from.p[2];
  out.y = from.y;
  out.x = from.x;
  return out;
};

const distance = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Same blending as the game's `sampleBuffer`, on relay time. */
const sampleTrack = (buffer: TimedPose[], t: number, out: Pose): Pose => {
  if (t <= buffer[0].t) return copyPose(buffer[0].pose, out);
  for (let i = buffer.length - 2; i >= 0; i -= 1) {
    const a = buffer[i];
    const b = buffer[i + 1];
    if (t >= a.t && t < b.t) {
      if (distance(a.pose.p, b.pose.p) > SNAP_DISTANCE) return copyPose(a.pose, out);
      const alpha = (t - a.t) / (b.t - a.t);
      out.p[0] = a.pose.p[0] + (b.pose.p[0] - a.pose.p[0]) * alpha;
      out.p[1] = a.pose.p[1] + (b.pose.p[1] - a.pose.p[1]) * alpha;
      out.p[2] = a.pose.p[2] + (b.pose.p[2] - a.pose.p[2]) * alpha;
      out.y = a.pose.y + wrapAngle(b.pose.y - a.pose.y) * alpha;
      out.x = a.pose.x + (b.pose.x - a.pose.x) * alpha;
      return out;
    }
  }
  return copyPose(buffer[buffer.length - 1].pose, out);
};

/**
 * Remote players as the relay reports them, kept a little in the past so they can be drawn
 * between two snapshots instead of jumping from one to the next.
 */
export const createSnapshotStore = (): SnapshotStore => {
  const tracks = new Map<string, Track>();

  const append = (track: Track, t: number, pose: Pose) => {
    const { buffer } = track;
    const last = buffer[buffer.length - 1];
    // After a pause the last pose is repeated one interval before the move, so the move
    // blends from where the player stood instead of across the whole idle gap.
    const resumeAt = t - RELAY_TIMING.snapshotIntervalMs;
    if (resumeAt > last.t) buffer.push({ t: resumeAt, pose: last.pose });
    buffer.push({ t, pose });
    if (buffer.length > SNAPSHOT_BUFFER_LENGTH) {
      buffer.splice(0, buffer.length - SNAPSHOT_BUFFER_LENGTH);
    }
  };

  return {
    apply: (snapshot) => {
      snapshot.players.forEach(([id, x, y, z, yaw, pitch, w, flags]) => {
        const pose: Pose = { p: [x, y, z], y: yaw, x: pitch };
        const state: RemoteState = {
          t: snapshot.t,
          pose,
          w,
          alive: (flags & SNAPSHOT_FLAGS.ALIVE) !== 0,
          on: (flags & SNAPSHOT_FLAGS.IN_ARENA) !== 0,
        };
        const track = tracks.get(id);
        if (!track) {
          tracks.set(id, { buffer: [{ t: snapshot.t, pose }], latest: state });
          return;
        }
        // Snapshots can arrive out of order or twice; only a newer one moves the player.
        if (snapshot.t <= track.buffer[track.buffer.length - 1].t) return;
        append(track, snapshot.t, pose);
        track.latest = state;
      });
    },
    remove: (userId) => {
      tracks.delete(userId);
    },
    clear: () => {
      tracks.clear();
    },
    sample: (userId, t, out) => {
      const track = tracks.get(userId);
      return track ? sampleTrack(track.buffer, t, out) : null;
    },
    latest: (userId) => tracks.get(userId)?.latest ?? null,
    userIds: () => [...tracks.keys()],
  };
};
