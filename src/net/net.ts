import { NET_TIMING } from './constants';
import {
  diffSnapshots, encodePayload, hasMeaningfulChange, pushSample, sampleBuffer,
} from './service';
import {
  FragEvent, GameNet, IncomingHit, PayloadSender, PlayerPayload, RemoteShot, Sample,
} from './types';

interface RemotePlayer {
  latest: PlayerPayload;
  samples: Sample[];
  lastHitSeq: number;
  /** Local time of the last entry update, for hiding players whose client went away. */
  heardAt: number;
}

export const createGameNet = (): GameNet => {
  let sender: PayloadSender | null = null;
  let localUserId: string | null = null;
  let currentRound: string | null = null;
  let restoredOwn: PlayerPayload | null = null;
  let local: PlayerPayload | null = null;
  let lastSent: PlayerPayload | null = null;
  let lastSentAt = -Infinity;
  let sendCount = 0;
  const remotes = new Map<string, RemotePlayer>();
  let incomingHits: IncomingHit[] = [];
  let shots: RemoteShot[] = [];
  let frags: FragEvent[] = [];

  const inRound = (snapshot: PlayerPayload) => !!currentRound && snapshot.r === currentRound;

  return {
    attachSender: (nextSender) => {
      sender = nextSender;
      lastSent = null; // a new transport gets the current payload right away
      lastSentAt = -Infinity;
    },
    setLocalUserId: (userId) => { localUserId = userId; },
    getLocalUserId: () => localUserId,
    setRound: (nextRound) => { currentRound = nextRound; },
    getRound: () => currentRound,
    restoreOwn: (snapshot) => {
      restoredOwn = snapshot;
      sendCount = Math.max(sendCount, snapshot.t);
    },
    takeRestoredOwn: () => {
      const snapshot = restoredOwn;
      restoredOwn = null;
      return snapshot;
    },
    publishLocal: (payload, now, force = false) => {
      local = payload;
      if (!sender) return;
      const elapsed = now - lastSentAt;
      if (!force && elapsed < NET_TIMING.minSendIntervalMs) return;
      const encoded = encodePayload(payload);
      const heartbeatDue = payload.on && elapsed >= NET_TIMING.heartbeatMs;
      if (!force && !heartbeatDue && !hasMeaningfulChange(lastSent, encoded)) return;
      sendCount += 1;
      const sent = { ...encoded, t: sendCount };
      sender(sent);
      lastSent = sent;
      lastSentAt = now;
    },
    getLocal: () => local,
    ingest: (userId, snapshot, now) => {
      const remote = remotes.get(userId);
      const changes = diffSnapshots(
        userId,
        remote?.latest ?? null,
        snapshot,
        localUserId,
        remote?.lastHitSeq ?? 0,
      );
      if (inRound(snapshot)) {
        incomingHits.push(...changes.incomingHits);
        if (changes.shots > 0) shots.push({ userId, count: changes.shots });
        if (changes.frag) frags.push(changes.frag);
      }
      const sample = { t: now, pose: { p: snapshot.p, y: snapshot.y, x: snapshot.x } };
      if (remote) {
        remote.latest = snapshot;
        remote.lastHitSeq = changes.lastHitSeq;
        remote.heardAt = now;
        pushSample(remote.samples, sample);
      } else {
        remotes.set(userId, {
          latest: snapshot, samples: [sample], lastHitSeq: changes.lastHitSeq, heardAt: now,
        });
      }
    },
    retainUsers: (keep) => {
      [...remotes.keys()].forEach((userId) => {
        if (!keep.has(userId)) remotes.delete(userId);
      });
    },
    activeUserIds: (now) => [...remotes.entries()]
      .filter(([, remote]) => remote.latest.on
        && inRound(remote.latest)
        && now - remote.heardAt < NET_TIMING.staleAfterMs)
      .map(([userId]) => userId),
    roundSnapshots: () => new Map(
      [...remotes.entries()]
        .filter(([, remote]) => inRound(remote.latest))
        .map(([userId, remote]) => [userId, remote.latest]),
    ),
    latest: (userId) => remotes.get(userId)?.latest ?? null,
    sample: (userId, now, out) => {
      const remote = remotes.get(userId);
      if (!remote) return null;
      return sampleBuffer(remote.samples, now - NET_TIMING.interpolationDelayMs, out);
    },
    drainIncomingHits: () => {
      const drained = incomingHits;
      incomingHits = [];
      return drained;
    },
    drainShots: () => {
      const drained = shots;
      shots = [];
      return drained;
    },
    drainFrags: () => {
      const drained = frags;
      frags = [];
      return drained;
    },
  };
};
