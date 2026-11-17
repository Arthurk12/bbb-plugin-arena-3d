import { Vec3 } from '../../src/commons/types';
import { NO_RELOAD } from '../../src/game/ammo/constants';
import {
  ammoLines, canReload, canTakeAmmoBox, reloaded, spawnAmmo, spendRound, withAmmoBox,
} from '../../src/game/ammo/service';
import {
  PICKUP_RADIUS, PICKUP_REACH_HEIGHT, PICKUP_RESPAWN_MS,
} from '../../src/game/combat/constants';
import {
  canHeal, createCombatState, heal, respawn, respawnDue, takeDamage,
} from '../../src/game/combat/service';
import { distanceXZ } from '../../src/game/geometry/service';
import { zoneIndex } from '../../src/game/hitbox/service';
import { ARENA_LEVEL } from '../../src/game/level/layout';
import { pickSpawn } from '../../src/game/level/service';
import { WEAPONS } from '../../src/game/weapons/constants';
import { weaponAt } from '../../src/game/weapons/service';
import {
  AMMO_UPDATE, CLIENT_MESSAGE, CLOSE_CODES, ENV_KIND, ENVIRONMENT_WEAPON, ENVIRONMENT_ZONE,
  RELAY_LIMITS, RELAY_TIMING, SERVER_MESSAGE, SNAPSHOT_FLAGS,
} from '../../src/protocol/constants';
import {
  AmmoUpdate, ClientMessage, EnvMessage, PickupMessage, PlayerInfo, PoseMessage, ReloadMessage,
  ScoreLine, Scores, ServerMessage, ShotMessage, SnapshotEntry,
} from '../../src/protocol/types';
import {
  MAX_HEAL, MAX_PLAYER_SPEED, PICKUP_SLACK, POSE_PRECISION, TELEPORT_SLACK,
} from './constants';
import { recordHistory } from './history';
import { evaluateShot } from './hits';
import {
  PlayerState, Room, RoomClient, RoomOptions,
} from './types';

/** Every rounding of poses goes through here, so the snapshot matches what the client sent. */
const round2 = (n: number): number => Math.round(n * POSE_PRECISION) / POSE_PRECISION;

const distance = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * One arena match: the players connected to it, their poses and health, and the scores that
 * outlive them. The relay is the only judge of hits, kills and positions; clients only show.
 */
export const createRoom = (key: string, options: RoomOptions): Room => {
  const {
    clock,
    random = Math.random,
    level = ARENA_LEVEL,
    maxPlayers = RELAY_LIMITS.maxPlayersPerRoom,
  } = options;

  // Connected players only; scores and names are kept after they leave.
  const players = new Map<string, PlayerState>();
  const scores = new Map<string, ScoreLine>();
  const names = new Map<string, string>();
  let emptySinceAt: number | null = null;
  let lastFullSnapshotAt = -Infinity;

  const broadcast = (message: ServerMessage, exceptUserId?: string) => {
    players.forEach((player, userId) => {
      if (userId !== exceptUserId) {
        player.client.send(message);
      }
    });
  };

  const scoresObject = (): Scores => Object.fromEntries(scores);
  const namesObject = (): Record<string, string> => Object.fromEntries(names);

  const sendScores = () => {
    broadcast({ type: SERVER_MESSAGE.SCORES, scores: scoresObject(), names: namesObject() });
  };

  const info = (player: PlayerState): PlayerInfo => ({
    id: player.userId,
    name: player.name,
    p: player.p,
    y: player.y,
    x: player.x,
    w: player.w,
    hp: player.combat.health,
    alive: player.combat.alive,
    on: player.on,
  });

  // Spawn far from the living, so nobody appears on top of someone else.
  const spawnPoint = (exceptUserId: string) => {
    const others: Vec3[] = [];
    players.forEach((player) => {
      if (!player.spectator && player.combat.alive && player.userId !== exceptUserId) {
        others.push(player.p);
      }
    });
    return pickSpawn(level.spawns, others, random);
  };

  const onDeath = (victim: PlayerState, killerId: string, weapon: number, zone: number) => {
    victim.dirty = true;
    victim.reloadWeapon = NO_RELOAD;
    broadcast({
      type: SERVER_MESSAGE.KILL, by: killerId, to: victim.userId, w: weapon, zone,
    });

    const [victimKills, victimDeaths] = scores.get(victim.userId) ?? [0, 0];
    scores.set(victim.userId, [victimKills, victimDeaths + 1]);
    if (killerId !== victim.userId) {
      const [killerKills, killerDeaths] = scores.get(killerId) ?? [0, 0];
      scores.set(killerId, [killerKills + 1, killerDeaths]);
    }
    sendScores();
  };

  /** A player's own ammo, to them only. */
  const sendAmmo = (player: PlayerState, why: AmmoUpdate) => {
    player.client.send({ type: SERVER_MESSAGE.AMMO, why, a: ammoLines(player.ammo) });
  };

  /**
   * Finishes a reload that is due. A shot or a pose may finish it `tolerance` ms early: it
   * crossed the network after the client's own reload ended.
   */
  const finishReload = (player: PlayerState, now: number, tolerance: number) => {
    if (player.reloadWeapon === NO_RELOAD || now < player.reloadDoneAt - tolerance) {
      return;
    }
    player.ammo = reloaded(player.ammo, player.reloadWeapon);
    player.reloadWeapon = NO_RELOAD;
    sendAmmo(player, AMMO_UPDATE.RELOAD);
  };

  const join = (client: RoomClient) => {
    const now = clock();
    let player = players.get(client.userId);

    if (player) {
      // Same user on a new socket (a reconnect): keep health and pose, take the new connection.
      if (player.client !== client) {
        player.client.close(CLOSE_CODES.REPLACED, 'replaced');
        player.client = client;
        player.name = client.name;
      }
    } else {
      const playing = [...players.values()].filter((p) => !p.spectator).length;
      const spawn = spawnPoint(client.userId);
      const spectator = playing >= maxPlayers;
      const created: PlayerState = {
        userId: client.userId,
        name: client.name,
        client,
        spectator,
        p: [...spawn.position] as Vec3,
        y: spawn.yaw,
        x: 0,
        w: 0,
        on: true,
        combat: createCombatState(now),
        life: 1,
        lastPoseAt: now,
        lastShotAt: -Infinity,
        ammo: spawnAmmo(),
        reloadWeapon: NO_RELOAD,
        reloadDoneAt: 0,
        pickupReadyAt: level.pickups.map(() => 0),
        dirty: true,
        history: [],
      };
      players.set(client.userId, created);
      player = created;

      if (!spectator) {
        recordHistory(created.history, {
          t: now, p: [...created.p] as Vec3, y: created.y, x: created.x, alive: true, life: 1,
        });
      }
      if (!scores.has(client.userId)) {
        scores.set(client.userId, [0, 0]);
      }
      broadcast({ type: SERVER_MESSAGE.JOIN, id: client.userId, name: client.name }, client.userId);
    }
    names.set(client.userId, client.name);

    const playerList = [...players.values()]
      .filter((p) => !p.spectator)
      .map(info);
    client.send({
      type: SERVER_MESSAGE.WELCOME,
      you: client.userId,
      now,
      spectator: player.spectator,
      players: playerList,
      scores: scoresObject(),
      names: namesObject(),
    });
    if (!player.spectator) {
      sendAmmo(player, AMMO_UPDATE.SPAWN);
    }
    emptySinceAt = null;
  };

  const leave = (userId: string, client: RoomClient) => {
    const player = players.get(userId);
    if (!player || player.client !== client) {
      return;
    }
    players.delete(userId);
    broadcast({ type: SERVER_MESSAGE.LEAVE, id: userId });
    if (players.size === 0) {
      emptySinceAt = clock();
    }
  };

  const handlePose = (player: PlayerState, message: PoseMessage,
    now: number) => {
    if (player.spectator) {
      return;
    }
    finishReload(player, now, RELAY_TIMING.reloadToleranceMs);
    if (player.reloadWeapon !== NO_RELOAD && message.w !== player.reloadWeapon) {
      // Switching weapons drops the reload.
      player.reloadWeapon = NO_RELOAD;
    }
    player.y = round2(message.y);
    player.x = round2(message.x);
    player.w = message.w;
    player.on = message.on;
    player.dirty = true;

    if (player.combat.alive) {
      // Enough slack for the time since the last pose, at the fastest a player can move.
      const elapsed = Math.max(now - player.lastPoseAt, RELAY_TIMING.snapshotIntervalMs);
      const maxDistance = (MAX_PLAYER_SPEED * elapsed) / 1000 + TELEPORT_SLACK;
      if (distance(player.p, message.p) <= maxDistance) {
        const [x, y, z] = message.p;
        player.p = [round2(x), round2(y), round2(z)];
      }
    }
    player.lastPoseAt = now;
  };

  const handleShot = (
    player: PlayerState,
    message: ShotMessage,
    now: number,
  ) => {
    finishReload(player, now, RELAY_TIMING.reloadToleranceMs);
    const others = [...players.values()].filter((p) => p !== player);
    const verdict = evaluateShot(message, {
      now,
      rttMs: player.client.rttMs(),
      shooter: player,
      others,
      level,
    });
    if (!verdict.ok) {
      player.client.send({ type: SERVER_MESSAGE.REJECT, id: message.id, reason: verdict.reason });
      if (!player.spectator) {
        sendAmmo(player, AMMO_UPDATE.SYNC);
      }
      return;
    }

    const { userId } = player;
    player.lastShotAt = now;
    player.ammo = spendRound(player.ammo, message.w);
    broadcast({
      type: SERVER_MESSAGE.SHOT,
      by: userId,
      id: message.id,
      o: message.o,
      y: message.y,
      x: message.x,
      w: message.w,
      seed: message.seed,
    }, userId);

    const { result } = verdict;
    result.damageByUser.forEach((damage, targetId) => {
      const target = players.get(targetId);
      if (!target) {
        return;
      }
      const outcome = takeDamage(target.combat, damage, userId, targetId, now);
      target.combat = outcome.state;
      const zone = result.zoneByUser.get(targetId);
      const zoneId = zone ? zoneIndex(zone) : ENVIRONMENT_ZONE;
      if (outcome.taken > 0) {
        broadcast({
          type: SERVER_MESSAGE.HIT,
          by: userId,
          to: targetId,
          dmg: outcome.taken,
          zone: zoneId,
          hp: outcome.state.health,
        });
      }
      if (outcome.died) {
        onDeath(target, userId, message.w, zoneId);
      }
    });
  };

  const handleEnv = (player: PlayerState, message: EnvMessage,
    now: number) => {
    if (player.spectator || !player.combat.alive) {
      return;
    }
    const { userId } = player;
    if (message.kind === ENV_KIND.DAMAGE) {
      const outcome = takeDamage(player.combat, message.amount, userId, userId, now);
      player.combat = outcome.state;
      if (outcome.taken > 0) {
        broadcast({
          type: SERVER_MESSAGE.HIT,
          by: userId,
          to: userId,
          dmg: outcome.taken,
          zone: ENVIRONMENT_ZONE,
          hp: outcome.state.health,
        });
      }
      if (outcome.died) {
        onDeath(player, userId, ENVIRONMENT_WEAPON, ENVIRONMENT_ZONE);
      }
    } else if (canHeal(player.combat)) {
      player.combat = heal(player.combat, Math.min(message.amount, MAX_HEAL));
      broadcast({ type: SERVER_MESSAGE.HEALTH, id: userId, hp: player.combat.health });
    }
  };

  const handleReload = (player: PlayerState, message: ReloadMessage, now: number) => {
    if (player.spectator || !player.combat.alive) {
      return;
    }
    finishReload(player, now, RELAY_TIMING.reloadToleranceMs);
    if (player.reloadWeapon !== NO_RELOAD) {
      return;
    }
    if (!canReload(player.ammo, message.w)) {
      sendAmmo(player, AMMO_UPDATE.SYNC);
      return;
    }
    player.reloadWeapon = message.w;
    player.reloadDoneAt = now + WEAPONS[weaponAt(message.w)].ammo.reloadMs;
  };

  /** An ammo box counts only when the relay sees the player by it, and it is theirs to take. */
  const handlePickup = (player: PlayerState, message: PickupMessage, now: number) => {
    const pickup = level.pickups[message.i];
    if (!pickup || pickup.kind !== 'ammo' || player.spectator || !player.combat.alive) {
      return;
    }
    const near = distanceXZ(player.p, pickup.position) <= PICKUP_RADIUS + PICKUP_SLACK
      && Math.abs(player.p[1] - pickup.position[1]) <= PICKUP_REACH_HEIGHT + PICKUP_SLACK;
    if (!near || now < player.pickupReadyAt[message.i] || !canTakeAmmoBox(player.ammo)) {
      return;
    }
    player.pickupReadyAt[message.i] = now + PICKUP_RESPAWN_MS;
    player.ammo = withAmmoBox(player.ammo);
    sendAmmo(player, AMMO_UPDATE.PICKUP);
  };

  const handle = (userId: string, message: ClientMessage) => {
    const player = players.get(userId);
    if (!player) {
      return;
    }
    const now = clock();
    switch (message.type) {
      case CLIENT_MESSAGE.HELLO:
        return;
      case CLIENT_MESSAGE.PING:
        player.client.send({ type: SERVER_MESSAGE.PONG, c: message.c, s: now });
        return;
      case CLIENT_MESSAGE.POSE:
        handlePose(player, message, now);
        return;
      case CLIENT_MESSAGE.SHOT:
        handleShot(player, message, now);
        return;
      case CLIENT_MESSAGE.ENV:
        handleEnv(player, message, now);
        return;
      case CLIENT_MESSAGE.RELOAD:
        handleReload(player, message, now);
        return;
      case CLIENT_MESSAGE.PICKUP:
        handlePickup(player, message, now);
        return;
      default:
    }
  };

  const tick = () => {
    const now = clock();

    players.forEach((player) => {
      if (player.spectator || player.combat.alive || !respawnDue(player.combat, now)) {
        return;
      }
      player.combat = respawn(player.combat, now);
      player.life += 1;
      player.ammo = spawnAmmo();
      player.reloadWeapon = NO_RELOAD;
      const spawn = spawnPoint(player.userId);
      player.p = [...spawn.position] as Vec3;
      player.y = spawn.yaw;
      player.lastPoseAt = now;
      player.dirty = true;
      broadcast({
        type: SERVER_MESSAGE.SPAWN,
        id: player.userId,
        p: [...spawn.position] as Vec3,
        y: spawn.yaw,
      });
      sendAmmo(player, AMMO_UPDATE.SPAWN);
    });

    players.forEach((player) => finishReload(player, now, 0));

    players.forEach((player) => {
      if (player.spectator) {
        return;
      }
      recordHistory(player.history, {
        t: now,
        p: [...player.p] as Vec3,
        y: player.y,
        x: player.x,
        alive: player.combat.alive,
        life: player.life,
      });
    });

    const full = now - lastFullSnapshotAt >= RELAY_TIMING.fullSnapshotIntervalMs;
    const entries: SnapshotEntry[] = [];
    players.forEach((player) => {
      if (player.spectator || !(full || player.dirty)) {
        return;
      }
      const [x, y, z] = player.p;
      const flags = (player.combat.alive ? SNAPSHOT_FLAGS.ALIVE : 0)
        | (player.on ? SNAPSHOT_FLAGS.IN_ARENA : 0);
      entries.push([player.userId, x, y, z, player.y, player.x, player.w, flags]);
    });
    if (entries.length > 0) {
      broadcast({ type: SERVER_MESSAGE.SNAPSHOT, t: now, players: entries });
    }
    players.forEach((player) => {
      player.dirty = false;
    });
    if (full) {
      lastFullSnapshotAt = now;
    }
  };

  return {
    key,
    join,
    leave,
    handle,
    tick,
    connectedCount: () => players.size,
    emptySince: () => emptySinceAt,
  };
};
