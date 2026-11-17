import { describe, expect, it, vi } from 'vitest';
import { Vec3 } from '../../src/commons/types';
import { ammoLines, spawnAmmo, withAmmoBox } from '../../src/game/ammo/service';
import { RESPAWN_DELAY_MS, SPAWN_PROTECTION_MS } from '../../src/game/combat/constants';
import { ARENA_LEVEL } from '../../src/game/level/layout';
import { LevelBlock, LevelDefinition } from '../../src/game/level/types';
import { PLAYER } from '../../src/game/player/constants';
import { WEAPON_IDS, WEAPONS } from '../../src/game/weapons/constants';
import {
  CLIENT_MESSAGE, CLOSE_CODES, ENV_KIND, ENVIRONMENT_WEAPON, ENVIRONMENT_ZONE, SERVER_MESSAGE,
  SNAPSHOT_FLAGS,
} from '../../src/protocol/constants';
import {
  EnvMessage, PoseMessage, ServerMessage, ShotMessage,
} from '../../src/protocol/types';
import { createRoom } from '../../relay/src/room';
import { RoomClient, RoomOptions } from '../../relay/src/types';

/** A level with no walls and two spawns: the first player starts at z=10, the second at z=5. */
const TEST_LEVEL: LevelDefinition = {
  ...ARENA_LEVEL,
  blocks: [],
  spawns: [{ position: [0, 0, 10], yaw: 0 }, { position: [0, 0, 5], yaw: Math.PI }],
};

const WALL: LevelBlock = { min: [-3, 0, 7], max: [3, 3, 8], material: 'wall' };

const ORIGIN: Vec3 = [0, PLAYER.eyeHeight, 10];
/** Aims at 1 m above the feet of a player 5 m away: the body, not the head. */
const BODY_PITCH = Math.atan2(1.0 - PLAYER.eyeHeight, 5);
const TICK_MS = 50;
/** Straight up: a shot that hits nobody. */
const SKY = 1.4;

const fakeClient = (userId: string) => {
  const sent: ServerMessage[] = [];
  const client: RoomClient = {
    userId,
    name: userId,
    send: (message) => {
      sent.push(message);
    },
    rttMs: () => 0,
    close: vi.fn(),
  };
  return { client, sent };
};

const messagesOf = <T extends ServerMessage['type']>(sent: ServerMessage[], type: T) => (
  sent.filter((m): m is Extract<ServerMessage, { type: T }> => m.type === type)
);

const setup = (options: Partial<RoomOptions> = {}) => {
  const time = { now: 10_000 };
  const room = createRoom('m1:r1', {
    clock: () => time.now,
    random: () => 0,
    level: TEST_LEVEL,
    ...options,
  });
  /** Advances the clock, ticking every TICK_MS. */
  const tickFor = (ms: number) => {
    for (let elapsed = 0; elapsed < ms; elapsed += TICK_MS) {
      time.now += TICK_MS;
      room.tick();
    }
  };
  return { room, time, tickFor };
};

/** Two players joined, past spawn protection, with some history built up. */
const start = (options: Partial<RoomOptions> = {}) => {
  const s = setup(options);
  const u1 = fakeClient('u1');
  const u2 = fakeClient('u2');
  s.room.join(u1.client);
  s.room.join(u2.client);
  s.tickFor(SPAWN_PROTECTION_MS + 100);
  return { ...s, u1, u2 };
};

const shotWith = (fields: Partial<ShotMessage> & Pick<ShotMessage, 'id' | 'vt'>): ShotMessage => ({
  type: CLIENT_MESSAGE.SHOT,
  o: ORIGIN,
  y: 0,
  x: BODY_PITCH,
  w: 0,
  seed: 1,
  ads: false,
  ...fields,
});

/** A shot that is consistent with the RTT of 0 the fake clients report. */
const bodyShot = (id: number, now: number): ShotMessage => shotWith({ id, vt: now - 100 });

const poseTo = (p: Vec3): PoseMessage => ({
  type: CLIENT_MESSAGE.POSE, p, y: 0, x: 0, w: 0, on: true,
});

const envDamage = (amount: number): EnvMessage => ({
  type: CLIENT_MESSAGE.ENV, kind: ENV_KIND.DAMAGE, amount, cause: 'fall',
});

/** Five body hits from u1 on u2, spaced past the blaster cooldown: u2 dies. */
const killU2 = (s: ReturnType<typeof start>) => {
  for (let i = 1; i <= 5; i += 1) {
    if (i > 1) s.tickFor(400);
    s.room.handle('u1', bodyShot(i, s.time.now));
  }
};

describe('createRoom', () => {
  it('welcomes the first player, then tells the first about the second', () => {
    const { room, time } = setup();
    const u1 = fakeClient('u1');
    const u2 = fakeClient('u2');

    room.join(u1.client);
    expect(u1.sent[0]).toMatchObject({
      type: 'welcome',
      you: 'u1',
      spectator: false,
      now: time.now,
      players: [expect.objectContaining({ id: 'u1' })],
      scores: { u1: [0, 0] },
    });
    expect(messagesOf(u1.sent, 'welcome')[0].players).toHaveLength(1);

    room.join(u2.client);
    expect(messagesOf(u1.sent, 'join')).toEqual([{ type: 'join', id: 'u2', name: 'u2' }]);
    const welcome = messagesOf(u2.sent, 'welcome')[0];
    expect(welcome.players.map((p) => p.id)).toEqual(['u1', 'u2']);
  });

  it('sends a body hit to the target and a shot to the others, not back to the shooter', () => {
    const s = start();
    s.room.handle('u1', bodyShot(1, s.time.now));

    expect(messagesOf(s.u2.sent, 'hit')).toEqual([{
      type: 'hit', by: 'u1', to: 'u2', dmg: 22, zone: 1, hp: 78,
    }]);
    expect(messagesOf(s.u2.sent, 'shot')).toEqual([
      expect.objectContaining({ type: 'shot', by: 'u1', id: 1 }),
    ]);
    expect(messagesOf(s.u1.sent, 'shot')).toEqual([]);
  });

  it('kills the target after five body hits and scores the frag', () => {
    const s = start();
    killU2(s);

    expect(messagesOf(s.u1.sent, 'kill')).toEqual([
      { type: 'kill', by: 'u1', to: 'u2', w: 0, zone: 1 },
    ]);
    const scores = messagesOf(s.u1.sent, 'scores');
    expect(scores[scores.length - 1].scores).toEqual({ u1: [1, 0], u2: [0, 1] });
  });

  it('kills with one sniper headshot through the scope', () => {
    const s = start();
    const sniper = WEAPON_IDS.indexOf('sniper');
    s.room.handle('u1', shotWith({
      id: 1, vt: s.time.now - 100, x: 0, w: sniper, ads: true,
    }));

    expect(messagesOf(s.u2.sent, 'hit')[0]).toMatchObject({ zone: 0, dmg: 100, hp: 0 });
    expect(messagesOf(s.u1.sent, 'kill')).toEqual([
      {
        type: 'kill', by: 'u1', to: 'u2', w: sniper, zone: 0,
      },
    ]);
  });

  it('respawns the victim once the respawn delay has passed', () => {
    const s = start();
    killU2(s);
    s.tickFor(RESPAWN_DELAY_MS);

    expect(messagesOf(s.u2.sent, 'spawn')).toEqual([
      expect.objectContaining({ type: 'spawn', id: 'u2' }),
    ]);
  });

  it('rejects a shot during the cooldown', () => {
    const s = start();
    s.room.handle('u1', bodyShot(1, s.time.now));
    s.tickFor(100);
    s.room.handle('u1', bodyShot(2, s.time.now));

    expect(messagesOf(s.u1.sent, 'reject')).toEqual([{ type: 'reject', id: 2, reason: 'cooldown' }]);
  });

  it('rejects a shot that leaves from 5 m away from the eye', () => {
    const s = start();
    s.room.handle('u1', shotWith({
      id: 1, vt: s.time.now - 100, o: [0, PLAYER.eyeHeight, 5],
    }));

    expect(messagesOf(s.u1.sent, 'reject')).toEqual([{ type: 'reject', id: 1, reason: 'origin' }]);
  });

  it('rejects a shot from a dead shooter', () => {
    const s = start();
    s.room.handle('u1', envDamage(100));
    s.room.handle('u1', bodyShot(1, s.time.now));

    expect(messagesOf(s.u1.sent, 'reject')).toEqual([{ type: 'reject', id: 1, reason: 'dead' }]);
  });

  it('resolves a shot against where the target was at the view time', () => {
    const s = start();
    const stood = s.time.now;

    // The pose moves u2 two meters to the side; the ticks after it keep running.
    s.room.handle('u2', poseTo([2, 0, 5]));
    s.tickFor(150);

    // Aimed straight down -z (x = 0) at the old spot: a hit at the view time. At eye height the
    // ray meets the head, so it is a headshot.
    s.room.handle('u1', shotWith({ id: 1, vt: stood, x: 0 }));
    const hits = messagesOf(s.u2.sent, 'hit');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ by: 'u1', to: 'u2', zone: 0, dmg: 44 });

    // Well past the cooldown, the view time is 100 ms old and u2 has moved away: no hit.
    s.tickFor(450);
    s.room.handle('u1', shotWith({ id: 2, vt: s.time.now - 100, x: 0 }));
    expect(messagesOf(s.u2.sent, 'hit')).toHaveLength(1);
    expect(messagesOf(s.u1.sent, 'reject')).toEqual([]);
  });

  it('does not hit a target behind a wall', () => {
    const s = start({ level: { ...TEST_LEVEL, blocks: [WALL] } });
    s.room.handle('u1', bodyShot(1, s.time.now));

    expect(messagesOf(s.u2.sent, 'hit')).toEqual([]);
    expect(messagesOf(s.u1.sent, 'reject')).toEqual([]);
  });

  it('refuses a pose that teleports the player and keeps the old position', () => {
    const { room, time } = setup();
    const u1 = fakeClient('u1');
    const u2 = fakeClient('u2');
    room.join(u1.client);
    room.join(u2.client);
    room.tick();

    // 50 ms after the join: far too little time to cover 50 m.
    time.now += TICK_MS;
    room.handle('u2', poseTo([50, 0, 5]));
    room.tick();

    const snaps = messagesOf(u1.sent, 'snap');
    const entry = snaps[snaps.length - 1].players.find((e) => e[0] === 'u2');
    expect(entry?.slice(1, 4)).toEqual([0, 0, 5]);
  });

  it('joins a player past the limit as a spectator, whose shots are rejected', () => {
    const { room } = setup({ maxPlayers: 1 });
    const u1 = fakeClient('u1');
    const u2 = fakeClient('u2');
    room.join(u1.client);
    room.join(u2.client);

    expect(messagesOf(u2.sent, 'welcome')[0]).toMatchObject({ spectator: true });
    room.handle('u2', bodyShot(7, 10_000));
    expect(messagesOf(u2.sent, 'reject')).toEqual([{ type: 'reject', id: 7, reason: 'spectator' }]);
  });

  it('keeps the scores and names of a player who left', () => {
    const s = start();
    killU2(s);
    s.room.leave('u1', s.u1.client);

    expect(messagesOf(s.u2.sent, 'leave')).toEqual([{ type: 'leave', id: 'u1' }]);

    const u3 = fakeClient('u3');
    s.room.join(u3.client);
    const welcome = messagesOf(u3.sent, 'welcome')[0];
    expect(welcome.scores.u1).toEqual([1, 0]);
    expect(welcome.names.u1).toBe('u1');
  });

  it('closes the old socket when the same user joins again', () => {
    const { room } = setup();
    const first = fakeClient('u1');
    const second = fakeClient('u1');
    room.join(first.client);
    room.join(second.client);

    expect(first.client.close).toHaveBeenCalledWith(CLOSE_CODES.REPLACED, 'replaced');
    expect(messagesOf(second.sent, 'welcome')).toHaveLength(1);
  });

  it('applies environment damage as a hit on the player, and a kill when it is fatal', () => {
    const { room } = setup();
    const u1 = fakeClient('u1');
    room.join(u1.client);

    room.handle('u1', envDamage(30));
    expect(messagesOf(u1.sent, 'hit')).toEqual([{
      type: 'hit', by: 'u1', to: 'u1', dmg: 30, zone: ENVIRONMENT_ZONE, hp: 70,
    }]);

    room.handle('u1', envDamage(100));
    expect(messagesOf(u1.sent, 'kill')).toEqual([{
      type: 'kill', by: 'u1', to: 'u1', w: ENVIRONMENT_WEAPON, zone: ENVIRONMENT_ZONE,
    }]);
    const scores = messagesOf(u1.sent, 'scores');
    expect(scores[scores.length - 1].scores).toEqual({ u1: [0, 1] });
  });

  it('heals a hurt player with an environment heal', () => {
    const { room } = setup();
    const u1 = fakeClient('u1');
    room.join(u1.client);

    room.handle('u1', envDamage(30));
    room.handle('u1', { type: CLIENT_MESSAGE.ENV, kind: ENV_KIND.HEAL, amount: 25, cause: 'kit' });
    expect(messagesOf(u1.sent, 'health')).toEqual([{ type: 'health', id: 'u1', hp: 95 }]);
  });

  it('sends a snapshot only when something changed, and everyone once in a while', () => {
    const { room, time, tickFor } = setup();
    const u1 = fakeClient('u1');
    const u2 = fakeClient('u2');
    room.join(u1.client);
    room.join(u2.client);
    room.tick(); // the first tick is a full snapshot

    time.now += TICK_MS;
    room.handle('u1', poseTo([0.5, 0, 10]));
    room.tick();
    const moved = messagesOf(u2.sent, 'snap');
    const last = moved[moved.length - 1];
    expect(last.players.map((e) => e[0])).toEqual(['u1']);
    expect(last.players[0].slice(1, 4)).toEqual([0.5, 0, 10]);
    expect(last.players[0][7]).toBe(SNAPSHOT_FLAGS.ALIVE | SNAPSHOT_FLAGS.IN_ARENA);

    const before = messagesOf(u2.sent, 'snap').length;
    tickFor(900); // quiet ticks, short of a full snapshot
    expect(messagesOf(u2.sent, 'snap')).toHaveLength(before);

    tickFor(TICK_MS);
    const full = messagesOf(u2.sent, 'snap');
    expect(full[full.length - 1].players.map((e) => e[0])).toEqual(['u1', 'u2']);
  });

  it('answers a ping with a pong echoing the client time and the relay clock', () => {
    const { room, time } = setup();
    const u1 = fakeClient('u1');
    room.join(u1.client);

    time.now = 10_123;
    room.handle('u1', { type: CLIENT_MESSAGE.PING, c: 5 });
    expect(messagesOf(u1.sent, 'pong')).toEqual([{ type: SERVER_MESSAGE.PONG, c: 5, s: 10_123 }]);
  });

  describe('ammo', () => {
    const SNIPER = WEAPON_IDS.indexOf('sniper');
    const sniperShot = (s: ReturnType<typeof start>, id: number) => shotWith({
      id, vt: s.time.now - 100, x: SKY, w: SNIPER,
    });
    const ammoOf = (sent: ServerMessage[], why: string) => messagesOf(sent, 'ammo')
      .filter((m) => m.why === why);

    it('sends each player their ammo after the welcome', () => {
      const s = start();
      expect(ammoOf(s.u1.sent, 'spawn')).toEqual([
        { type: 'ammo', why: 'spawn', a: ammoLines(spawnAmmo()) },
      ]);
    });

    it('refuses a shot with an empty magazine and sends the ammo back', () => {
      const s = start();
      const { magazine, startReserve } = WEAPONS.sniper.ammo;
      for (let i = 1; i <= magazine + 1; i += 1) {
        if (i > 1) s.tickFor(WEAPONS.sniper.cooldownMs);
        s.room.handle('u1', sniperShot(s, i));
      }
      expect(messagesOf(s.u1.sent, 'reject')).toEqual([
        { type: 'reject', id: magazine + 1, reason: 'ammo' },
      ]);
      expect(ammoOf(s.u1.sent, 'sync')[0].a[SNIPER]).toEqual([0, startReserve]);
    });

    it('reloads after the reload time, refusing shots meanwhile', () => {
      const s = start();
      const { magazine, reloadMs, startReserve } = WEAPONS.sniper.ammo;
      s.room.handle('u1', sniperShot(s, 1));
      s.room.handle('u1', { type: CLIENT_MESSAGE.RELOAD, w: SNIPER });
      s.tickFor(WEAPONS.sniper.cooldownMs);
      s.room.handle('u1', sniperShot(s, 2));
      expect(messagesOf(s.u1.sent, 'reject')).toEqual([
        { type: 'reject', id: 2, reason: 'reloading' },
      ]);

      s.tickFor(reloadMs);
      expect(ammoOf(s.u1.sent, 'reload')[0].a[SNIPER]).toEqual([magazine, startReserve - 1]);
      s.room.handle('u1', sniperShot(s, 3));
      expect(messagesOf(s.u1.sent, 'reject')).toHaveLength(1);
    });

    it('drops a reload when the player switches weapons', () => {
      const s = start();
      s.room.handle('u1', { ...poseTo([0, 0, 10]), w: SNIPER });
      s.room.handle('u1', sniperShot(s, 1));
      s.room.handle('u1', { type: CLIENT_MESSAGE.RELOAD, w: SNIPER });
      s.room.handle('u1', poseTo([0, 0, 10]));
      s.tickFor(WEAPONS.sniper.ammo.reloadMs + 100);
      expect(ammoOf(s.u1.sent, 'reload')).toEqual([]);
    });

    it('gives an ammo box only to a player by it, then not until it is back', () => {
      const pickups: LevelDefinition['pickups'] = [
        { kind: 'ammo', position: [0, 0, 10] },
        { kind: 'ammo', position: [20, 0, 20] },
      ];
      const s = start({ level: { ...TEST_LEVEL, pickups } });
      s.room.handle('u1', { type: CLIENT_MESSAGE.PICKUP, i: 1 });
      expect(ammoOf(s.u1.sent, 'pickup')).toEqual([]);

      s.room.handle('u1', { type: CLIENT_MESSAGE.PICKUP, i: 0 });
      expect(ammoOf(s.u1.sent, 'pickup')).toEqual([
        { type: 'ammo', why: 'pickup', a: ammoLines(withAmmoBox(spawnAmmo())) },
      ]);
      s.room.handle('u1', { type: CLIENT_MESSAGE.PICKUP, i: 0 });
      expect(ammoOf(s.u1.sent, 'pickup')).toHaveLength(1);
    });

    it('refills a player who respawns', () => {
      const s = start();
      killU2(s);
      s.tickFor(RESPAWN_DELAY_MS + TICK_MS);
      expect(ammoOf(s.u2.sent, 'spawn')).toHaveLength(2);
    });
  });
});
