import {
  describe, expect, it, vi,
} from 'vitest';
import { createGameNet } from '../../src/net/net';
import { NET_TIMING } from '../../src/net/constants';
import { PlayerPayload, Pose } from '../../src/net/types';

const payload = (overrides: Partial<PlayerPayload> = {}): PlayerPayload => ({
  r: 'round1',
  on: true,
  p: [0, 0, 0],
  y: 0,
  x: 0,
  h: 100,
  w: 0,
  s: 0,
  t: 0,
  hn: 0,
  dt: 0,
  lk: '',
  kb: {},
  hits: [],
  ...overrides,
});

const setup = () => {
  const net = createGameNet();
  net.setLocalUserId('me');
  net.setRound('round1');
  return net;
};

describe('createGameNet', () => {
  it('throttles sends and skips unchanged payloads', () => {
    const net = setup();
    const sender = vi.fn();
    net.attachSender(sender);
    net.publishLocal(payload(), 0);
    net.publishLocal(payload({ h: 50 }), 10);
    expect(sender).toHaveBeenCalledTimes(1);
    net.publishLocal(payload({ h: 50 }), NET_TIMING.minSendIntervalMs);
    expect(sender).toHaveBeenCalledTimes(2);
    net.publishLocal(payload({ h: 50 }), NET_TIMING.minSendIntervalMs * 3);
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it('sends a heartbeat so idle players are not taken for gone', () => {
    const net = setup();
    const sender = vi.fn();
    net.attachSender(sender);
    net.publishLocal(payload(), 0);
    net.publishLocal(payload(), NET_TIMING.heartbeatMs);
    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender.mock.calls[1][0].t).toBeGreaterThan(sender.mock.calls[0][0].t);
  });

  it('sends a forced payload right away', () => {
    const net = setup();
    const sender = vi.fn();
    net.attachSender(sender);
    net.publishLocal(payload(), 0);
    net.publishLocal(payload({ on: false }), 1, true);
    expect(sender).toHaveBeenLastCalledWith(expect.objectContaining({ on: false }));
  });

  it('turns remote updates into hits, shots and frags', () => {
    const net = setup();
    net.ingest('shooter', payload(), 0);
    net.ingest('shooter', payload({ s: 1, hn: 1, hits: [{ n: 1, u: 'me', d: 22 }] }), 300);
    net.ingest('victim', payload(), 0);
    net.ingest('victim', payload({ dt: 1, lk: 'shooter', h: 0 }), 300);
    expect(net.drainIncomingHits()).toEqual([{ from: 'shooter', damage: 22 }]);
    expect(net.drainShots()).toEqual([{ userId: 'shooter', count: 1 }]);
    expect(net.drainFrags()).toEqual([{ killer: 'shooter', victim: 'victim' }]);
    expect(net.drainIncomingHits()).toEqual([]);
  });

  it('ignores events from another round', () => {
    const net = setup();
    net.ingest('shooter', payload({ r: 'old' }), 0);
    net.ingest('shooter', payload({
      r: 'old', s: 1, hn: 1, hits: [{ n: 1, u: 'me', d: 22 }],
    }), 300);
    expect(net.drainIncomingHits()).toEqual([]);
    expect(net.activeUserIds(300)).toEqual([]);
  });

  it('hides players who left the arena or went silent', () => {
    const net = setup();
    net.ingest('a', payload(), 0);
    net.ingest('b', payload({ on: false }), 0);
    expect(net.activeUserIds(1000)).toEqual(['a']);
    expect(net.activeUserIds(NET_TIMING.staleAfterMs + 1)).toEqual([]);
    expect([...net.roundSnapshots().keys()].sort()).toEqual(['a', 'b']);
  });

  it('draws remote players in the past, between samples', () => {
    const net = setup();
    net.ingest('a', payload({ p: [0, 0, 0] }), 0);
    net.ingest('a', payload({ p: [2, 0, 0] }), 250);
    const out: Pose = { p: [0, 0, 0], y: 0, x: 0 };
    net.sample('a', 125 + NET_TIMING.interpolationDelayMs, out);
    expect(out.p[0]).toBeCloseTo(1);
  });

  it('hands the restored own entry over once', () => {
    const net = setup();
    net.restoreOwn(payload({ dt: 3, t: 40 }));
    expect(net.takeRestoredOwn()?.dt).toBe(3);
    expect(net.takeRestoredOwn()).toBeNull();
    const sender = vi.fn();
    net.attachSender(sender);
    net.publishLocal(payload(), 0);
    expect(sender.mock.calls[0][0].t).toBe(41);
  });

  it('forgets users who are no longer kept', () => {
    const net = setup();
    net.ingest('a', payload(), 0);
    net.retainUsers(new Set());
    expect(net.latest('a')).toBeNull();
  });
});
