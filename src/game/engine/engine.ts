import * as THREE from 'three';
import { Pose, Vec3 } from '../../commons/types';
import { clamp, wrapAngle } from '../../commons/utils';
import { DATA_TEST } from '../../commons/constants';
import { seededRandom } from '../../commons/random';
import { MAX_HEALTH } from '../../net/constants';
import { AMMO_UPDATE, ENV_KIND, RELAY_TIMING, SERVER_MESSAGE } from '../../protocol/constants';
import { PlayerInfo, ServerMessage, SnapshotEntry } from '../../protocol/types';
import { createRelayConnection } from '../../relay-client/connection';
import { createSnapshotStore } from '../../relay-client/snapshots';
import { RelayConnection } from '../../relay-client/types';
import { NO_RELOAD } from '../ammo/constants';
import {
  ammoFromLines, canReload, canTakeAmmoBox, hasRound, lowOnAmmo, reloaded, spawnAmmo,
  spendRound,
} from '../ammo/service';
import { Ammo } from '../ammo/types';
import {
  canHeal, createCombatState, respawn, respawnInSeconds,
} from '../combat/service';
import { PICKUP_RADIUS, PICKUP_REACH_HEIGHT, PICKUP_RESPAWN_MS } from '../combat/constants';
import { CombatState } from '../combat/types';
import { createArenaAudio } from '../effects/audio';
import { HEARING_DISTANCE, MUZZLE_OFFSET, REMOTE_TRACER_RANGE } from '../effects/constants';
import { createEffects } from '../effects/effects';
import { SoundId } from '../effects/types';
import { distanceXZ, pointAlong, rayBoxes } from '../geometry/service';
import { createHitbox, writeHitbox, zoneAt } from '../hitbox/service';
import {
  appendFeed, hitMarkerFor, pruneFeed, sameRows, scoreboardRows,
} from '../hud/service';
import {
  ConnectionState, FeedItem, HitMarker, Score, ScoreRow,
} from '../hud/types';
import { createInputController } from '../input/controller';
import { MAX_PITCH, MOUSE_SENSITIVITY } from '../input/constants';
import { buildLevel } from '../level/builder';
import { FOG, LIGHTS, SKY, SKY_COLOR } from '../level/constants';
import { ARENA_LEVEL } from '../level/layout';
import { pickSpawn } from '../level/service';
import { PLAYER } from '../player/constants';
import { stepPlayer } from '../player/service';
import { CollisionWorld, MoveIntent, PlayerBody } from '../player/types';
import { createAvatarCrowd } from '../remote/crowd';
import { RemoteAvatar } from '../remote/types';
import { VIEW_MODEL, WEAPONS } from '../weapons/constants';
import {
  aimDirection, canFire, cycleWeapon, pelletDirections, resolveShot, shotSpread, weaponAt,
  weaponIndex,
} from '../weapons/service';
import { ShotTarget, WeaponId } from '../weapons/types';
import { createViewModel } from '../weapons/view-model';
import {
  CAMERA, EMPTY_CLICK_MS, ENV_DAMAGE_BATCH, LIMB_HIT_VOLUME, MAX_FRAME_DT,
  MAX_TRACERS_PER_SHOT, POSE_SEND, SCOPE_LENS_AT, SPEED_SMOOTHING,
} from './constants';
import { ArenaEngine, EngineOptions } from './types';

interface RemoteEntry {
  avatar: RemoteAvatar;
  pose: Pose;
  previous: Vec3 | null;
  speed: number;
  target: ShotTarget;
}

interface SentPose {
  p: Vec3;
  y: number;
  x: number;
  w: number;
}

const IDLE_ENGINE: ArenaEngine = { requestPlay: () => {}, dispose: () => {} };

const SOUND_BY_WEAPON: Record<WeaponId, SoundId> = {
  blaster: 'blaster', shotgun: 'shotgun', smg: 'smg', sniper: 'sniper',
};

/** Seeds are 32-bit unsigned (see `seededRandom`). */
const SEED_RANGE = 2 ** 32;

const createRenderer = (): THREE.WebGLRenderer => new THREE.WebGLRenderer({
  antialias: false, powerPreference: 'high-performance',
});

const disposeScene = (scene: THREE.Scene) => {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
      material.dispose();
    });
  });
};

const round2 = (n: number): number => Math.round(n * POSE_SEND.precision) / POSE_SEND.precision;

const snapshotEntryOf = (player: PlayerInfo): SnapshotEntry => [
  player.id, player.p[0], player.p[1], player.p[2], player.y, player.x, player.w,
  // Same bits as SNAPSHOT_FLAGS (alive = 1, in the arena = 2).
  (player.alive ? 1 : 0) | (player.on ? 2 : 0),
];

/**
 * The game: one three.js scene and one animation loop, entirely outside React. The relay is the
 * judge of hits, health, deaths and scores; this side moves the local player, predicts tracers,
 * and draws everyone else 100 ms behind the relay's clock.
 */
export const createArenaEngine = ({
  container, hud, getContext, onWebglError, onConnectionStatus,
}: EngineOptions): ArenaEngine => {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = createRenderer();
  } catch (error) {
    onWebglError(error);
    hud.setState({ webglError: true });
    return IDLE_ENGINE;
  }
  const canvas = renderer.domElement;
  canvas.dataset.test = DATA_TEST.ARENA_CANVAS;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'pixelated';
  container.appendChild(canvas);

  const level = ARENA_LEVEL;
  const world: CollisionWorld = { solids: level.blocks, pads: level.pads, hazards: level.hazards };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY.horizon, FOG.near, FOG.far);
  scene.add(new THREE.HemisphereLight(
    LIGHTS.hemisphereSky,
    LIGHTS.hemisphereGround,
    LIGHTS.hemisphereIntensity,
  ));
  const sun = new THREE.DirectionalLight(LIGHTS.sunColor, LIGHTS.sunIntensity);
  sun.position.set(...LIGHTS.sunPosition);
  scene.add(sun);
  const builtLevel = buildLevel(level);
  scene.add(builtLevel.group);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const viewModel = createViewModel(camera);
  const effects = createEffects(scene, world.solids);
  const audio = createArenaAudio();
  const input = createInputController(canvas);
  const snapshots = createSnapshotStore();
  const crowd = createAvatarCrowd(scene);

  const body: PlayerBody = { position: [0, 0, 0], velocity: [0, 0, 0], grounded: false };
  let yaw = 0;
  let pitch = 0;
  let combat: CombatState = createCombatState(performance.now());
  let weapon: WeaponId = 'blaster';
  let lastShotAt = -Infinity;
  /** A freshly drawn gun can't shoot until it is up. */
  let weaponReadyAt = 0;
  /** How far the scope is zoomed in, 0 to 1. */
  let zoom = 0;
  /** Our rounds, predicted; the relay corrects them with `ammo`. */
  let ammo: Ammo = spawnAmmo();
  /** Weapon being reloaded (index), or NO_RELOAD. */
  let reloadWeapon = NO_RELOAD;
  let reloadDoneAt = 0;
  let lastEmptyClickAt = -Infinity;
  let shotId = 0;
  let hazardDamage = 0;
  let fellThisLife = false;
  let muted = false;
  let connection: RelayConnection | null = null;
  let connectionState: ConnectionState = 'idle';
  let currentRound: string | null = null;
  let myId: string | null = null;
  let spectator = false;
  /** Relay time the remote players are drawn at this frame; null until the clock is known. */
  let renderTime: number | null = null;
  let lastPoseSentAt = -Infinity;
  let lastPoseSent: SentPose | null = null;
  const pickupAvailableAt = level.pickups.map(() => 0);
  const remotes = new Map<string, RemoteEntry>();
  let scores = new Map<string, Score>();
  let scoresChanged = true;
  let feed: FeedItem[] = [];
  let feedId = 0;
  let hitMarker: HitMarker = 'body';
  let hitMarkerSeq = 0;
  let damageSeq = 0;
  let scoreboard: ScoreRow[] = [];
  let lastFrame = performance.now();
  const eye: Vec3 = [0, 0, 0];

  const play = (sound: SoundId, volume?: number) => audio.play(sound, volume);

  const volumeAt = (position: Vec3) => (
    1 - Math.min(1, distanceXZ(position, body.position) / HEARING_DISTANCE)
  );

  const placeBody = (p: Vec3, facing: number) => {
    body.position = [...p];
    body.velocity = [0, 0, 0];
    body.grounded = false;
    yaw = facing;
    pitch = 0;
    hazardDamage = 0;
    fellThisLife = false;
  };

  /** Where to stand until the relay says where we are (its welcome). */
  const placeLocally = () => {
    const point = pickSpawn(level.spawns, [], Math.random);
    placeBody(point.position, point.yaw);
  };

  const pushFeed = (killer: string, victim: string, weapon: number, zone: number, now: number) => {
    feedId += 1;
    feed = appendFeed(feed, {
      id: feedId,
      killer,
      victim,
      weapon: weaponAt(weapon),
      headshot: zoneAt(zone) === 'head',
      at: now,
    });
  };

  const send = (message: Parameters<RelayConnection['send']>[0]) => connection?.send(message);

  const handleWelcome = (message: Extract<ServerMessage, { type: 'welcome' }>, now: number) => {
    myId = message.you;
    ({ spectator } = message);
    snapshots.clear();
    const others = message.players.filter((player) => player.id !== message.you);
    if (others.length) {
      snapshots.apply({ type: SERVER_MESSAGE.SNAPSHOT, t: message.now, players: others.map(snapshotEntryOf) });
    }
    const me = message.players.find((player) => player.id === message.you);
    combat = createCombatState(now);
    ammo = spawnAmmo();
    reloadWeapon = NO_RELOAD;
    if (me) {
      placeBody(me.p, me.y);
      combat = { ...combat, health: me.hp, alive: me.alive };
    }
    scores = new Map(Object.entries(message.scores)
      .map(([userId, [kills, deaths]]) => [userId, { kills, deaths }]));
    scoresChanged = true;
    lastPoseSent = null;
  };

  const handleKill = (by: string, to: string, weapon: number, zone: number, now: number) => {
    pushFeed(by, to, weapon, zone, now);
    if (to === myId) {
      reloadWeapon = NO_RELOAD;
      combat = {
        ...combat,
        health: 0,
        alive: false,
        deaths: combat.deaths + 1,
        lastKiller: by,
        diedAt: now,
      };
      play('death');
    } else if (by === myId) {
      play('frag');
    }
  };

  const handleRemoteShot = (message: Extract<ServerMessage, { type: 'shot' }>, now: number) => {
    const remote = remotes.get(message.by);
    if (!remote) return;
    remote.avatar.flash(now);
    const from = remote.avatar.muzzlePosition();
    const dir = aimDirection(message.y, message.x);
    const distance = rayBoxes(from, dir, world.solids, REMOTE_TRACER_RANGE);
    const remoteWeapon = weaponAt(message.w);
    effects.tracer(from, pointAlong(from, dir, distance), WEAPONS[remoteWeapon].tracerColor, now);
    // Where a remote shot met a wall, it leaves sparks and a mark there too.
    if (distance < REMOTE_TRACER_RANGE) effects.spark(pointAlong(from, dir, distance), false, now);
    play(SOUND_BY_WEAPON[remoteWeapon], volumeAt(from));
  };

  /** The relay's count of our rounds wins over our prediction. */
  const applyAmmo = (message: Extract<ServerMessage, { type: 'ammo' }>) => {
    const fromRelay = ammoFromLines(message.a);
    if (message.why === AMMO_UPDATE.PICKUP) {
      // Shots may still be on their way: only the reserves changed.
      ammo = ammo.map((rounds, i) => ({
        ...rounds, reserve: fromRelay[i]?.reserve ?? rounds.reserve,
      }));
      return;
    }
    ammo = fromRelay;
    // A refused shot (sync) leaves a reload of ours running; anything else ends it.
    if (message.why !== AMMO_UPDATE.SYNC) reloadWeapon = NO_RELOAD;
  };

  /** Every relay message lands here as it arrives, also while the tab is in the background. */
  const handleMessage = (message: ServerMessage) => {
    const now = performance.now();
    switch (message.type) {
      case SERVER_MESSAGE.WELCOME:
        handleWelcome(message, now);
        return;
      case SERVER_MESSAGE.SNAPSHOT:
        snapshots.apply(message);
        return;
      case SERVER_MESSAGE.HIT:
        if (message.to === myId) {
          combat = { ...combat, health: message.hp };
          damageSeq += 1;
          if (message.hp > 0) play('pain');
        } else if (message.by === myId) {
          hitMarker = hitMarkerFor(zoneAt(message.zone));
          hitMarkerSeq += 1;
          if (hitMarker === 'head') play('headshot');
          else play('hit', hitMarker === 'limb' ? LIMB_HIT_VOLUME : 1);
        }
        return;
      case SERVER_MESSAGE.HEALTH:
        if (message.id === myId) combat = { ...combat, health: message.hp };
        return;
      case SERVER_MESSAGE.KILL:
        handleKill(message.by, message.to, message.w, message.zone, now);
        return;
      case SERVER_MESSAGE.SPAWN:
        if (message.id !== myId) return;
        placeBody(message.p, message.y);
        combat = respawn(combat, now);
        ammo = spawnAmmo();
        reloadWeapon = NO_RELOAD;
        play('respawn');
        return;
      case SERVER_MESSAGE.SCORES:
        scores = new Map(Object.entries(message.scores)
          .map(([userId, [kills, deaths]]) => [userId, { kills, deaths }]));
        scoresChanged = true;
        return;
      case SERVER_MESSAGE.SHOT:
        handleRemoteShot(message, now);
        return;
      case SERVER_MESSAGE.LEAVE:
        snapshots.remove(message.id);
        return;
      case SERVER_MESSAGE.AMMO:
        applyAmmo(message);
        return;
      default:
    }
  };

  const disconnect = () => {
    connection?.close();
    connection = null;
    connectionState = 'idle';
    myId = null;
    renderTime = null;
    snapshots.clear();
  };

  const connect = (round: string) => {
    const context = getContext();
    if (!context.sessionToken) {
      connectionState = 'failed';
      onConnectionStatus('failed');
      return;
    }
    connection = createRelayConnection({
      url: context.relayUrl,
      sessionToken: context.sessionToken,
      round,
      onMessage: handleMessage,
      onStatus: (status) => {
        connectionState = status;
        onConnectionStatus(status);
      },
    });
  };

  /** A new round is a new room on the relay: everything starts over there. */
  const followRound = () => {
    const { round } = getContext();
    if (round === currentRound) return;
    currentRound = round;
    disconnect();
    feed = [];
    scores = new Map();
    scoresChanged = true;
    if (round) connect(round);
  };

  const look = (lookX: number, lookY: number) => {
    // Zoomed in, the same mouse move turns less, so aiming keeps its feel.
    const sensitivity = MOUSE_SENSITIVITY * (camera.fov / CAMERA.fov);
    yaw -= lookX * sensitivity;
    pitch = clamp(pitch - lookY * sensitivity, -MAX_PITCH, MAX_PITCH);
  };

  /** Zooms in while the secondary button is held with a scoped gun up; out otherwise. */
  const updateZoom = (aiming: boolean, dt: number, now: number) => {
    const { scope } = WEAPONS[weapon];
    const wanted = scope !== null && aiming && combat.alive && !spectator && now >= weaponReadyAt;
    const step = scope ? (dt * 1000) / scope.zoomMs : 1;
    zoom = wanted ? Math.min(1, zoom + step) : Math.max(0, zoom - step);
    const fov = scope ? CAMERA.fov + (scope.fov - CAMERA.fov) * zoom : CAMERA.fov;
    if (camera.fov === fov) return;
    camera.fov = fov;
    camera.updateProjectionMatrix();
  };

  const switchWeapon = (next: WeaponId, now: number) => {
    if (next === weapon) return;
    weapon = next;
    reloadWeapon = NO_RELOAD;
    weaponReadyAt = now + VIEW_MODEL.switchMs;
    viewModel.setWeapon(weapon, now);
  };

  /** Starts reloading the weapon in hand, if it can; the relay times it too. */
  const startReload = (now: number) => {
    const index = weaponIndex(weapon);
    if (reloadWeapon !== NO_RELOAD || now < weaponReadyAt || !canReload(ammo, index)) return;
    const { reloadMs } = WEAPONS[weapon].ammo;
    reloadWeapon = index;
    reloadDoneAt = now + reloadMs;
    viewModel.reload(now, reloadMs);
    send({ type: 'reload', w: index });
    play('reload');
  };

  const updateReload = (now: number) => {
    if (reloadWeapon === NO_RELOAD || now < reloadDoneAt) return;
    ammo = reloaded(ammo, reloadWeapon);
    reloadWeapon = NO_RELOAD;
  };

  /** The level hurts us here; the relay applies it (a batch at a time, to spare messages). */
  const reportLevelDamage = (amount: number, cause: string) => {
    send({
      type: 'env', kind: ENV_KIND.DAMAGE, amount, cause,
    });
  };

  const movePlayer = (intent: MoveIntent, dt: number) => {
    const events = stepPlayer(body, intent, dt, world);
    if (events.jumped) play('jump');
    if (events.launched) play('pad');
    hazardDamage += events.hazardDamage;
    if (hazardDamage >= ENV_DAMAGE_BATCH) {
      const whole = Math.floor(hazardDamage);
      hazardDamage -= whole;
      reportLevelDamage(whole, 'slime');
    }
    if (body.position[1] < level.killY && !fellThisLife) {
      fellThisLife = true;
      reportLevelDamage(MAX_HEALTH, 'fall');
    }
  };

  const updatePickups = (now: number) => {
    level.pickups.forEach((pickup, i) => {
      const available = now >= pickupAvailableAt[i];
      builtLevel.setPickupAvailable(i, available);
      const useful = pickup.kind === 'ammo' ? canTakeAmmoBox(ammo) : canHeal(combat);
      if (!available || !useful) return;
      const near = distanceXZ(pickup.position, body.position) < PICKUP_RADIUS
        && Math.abs(body.position[1] - pickup.position[1]) < PICKUP_REACH_HEIGHT;
      if (!near) return;
      pickupAvailableAt[i] = now + PICKUP_RESPAWN_MS;
      if (pickup.kind === 'ammo') {
        // The relay checks we are by the box and answers with our new reserves.
        send({ type: 'pickup', i });
        play('ammo');
        return;
      }
      send({
        type: 'env', kind: ENV_KIND.HEAL, amount: pickup.heal, cause: 'kit',
      });
      play('pickup');
    });
  };

  /** Draws remote players where the relay had them `interpolationDelayMs` ago. */
  const updateRemotes = (dt: number): ShotTarget[] => {
    const context = getContext();
    const others = Math.max(0, context.maxPlayers - 1);
    const ids = renderTime === null ? [] : snapshots.userIds()
      .filter((userId) => userId !== myId && snapshots.latest(userId)?.on)
      .map((userId) => ({ userId, latest: snapshots.latest(userId)! }))
      .sort((a, b) => (
        distanceXZ(a.latest.pose.p, body.position) - distanceXZ(b.latest.pose.p, body.position)
      ))
      .slice(0, others);
    const keep = new Set(ids.map(({ userId }) => userId));
    [...remotes.entries()].forEach(([userId, remote]) => {
      if (keep.has(userId)) return;
      remote.avatar.dispose();
      remotes.delete(userId);
    });

    const targets: ShotTarget[] = [];
    ids.forEach(({ userId, latest }) => {
      let remote = remotes.get(userId);
      if (!remote) {
        const avatar = crowd.add(userId);
        remote = {
          avatar,
          pose: { p: [0, 0, 0], y: 0, x: 0 },
          previous: null,
          speed: 0,
          target: { userId, hitbox: createHitbox() },
        };
        remotes.set(userId, remote);
      }
      if (!snapshots.sample(userId, renderTime!, remote.pose)) return;
      const { pose } = remote;
      const moved = remote.previous && dt > 0 ? distanceXZ(remote.previous, pose.p) / dt : 0;
      remote.speed = remote.speed * SPEED_SMOOTHING + moved * (1 - SPEED_SMOOTHING);
      remote.previous = [...pose.p];
      const { alive } = latest;
      remote.avatar.update({
        pose, speed: remote.speed, alive, dt, now: performance.now(),
        weapon: weaponIndex(weaponAt(latest.w)),
        viewerDistance: distanceXZ(pose.p, body.position),
      });
      const user = context.users[userId];
      remote.avatar.setName(user?.name ?? context.fallbackName, user?.color ?? '#ffffff');
      if (!alive) return;
      writeHitbox(pose, remote.target.hitbox);
      targets.push(remote.target);
    });
    return targets;
  };

  /**
   * Shoots with the same pellets the relay will regenerate from the seed. Tracers and sparks show
   * at once; hit markers and damage wait for the relay's verdict.
   */
  const fire = (targets: ShotTarget[], now: number) => {
    const definition = WEAPONS[weapon];
    if (now < weaponReadyAt || reloadWeapon !== NO_RELOAD) return;
    if (!canFire(lastShotAt, now, definition)) return;
    const index = weaponIndex(weapon);
    if (!hasRound(ammo, index)) {
      if (canReload(ammo, index)) {
        startReload(now);
      } else if (now - lastEmptyClickAt >= EMPTY_CLICK_MS) {
        lastEmptyClickAt = now;
        play('empty');
      }
      return;
    }
    ammo = spendRound(ammo, index);
    lastShotAt = now;
    shotId += 1;
    const seed = Math.floor(Math.random() * SEED_RANGE);
    const scoped = zoom >= 1 && definition.scope !== null;
    const directions = pelletDirections(
      yaw,
      pitch,
      definition.pellets,
      shotSpread(definition, scoped),
      seededRandom(seed),
    );
    const result = resolveShot(eye, directions, world.solids, targets, definition);
    if (renderTime !== null) {
      send({
        type: 'shot',
        id: shotId,
        vt: renderTime,
        o: [...eye],
        y: wrapAngle(yaw),
        x: pitch,
        w: index,
        seed,
        ads: scoped,
      });
    }
    const forward = aimDirection(yaw, pitch);
    const right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const muzzle: Vec3 = [
      eye[0] + forward[0] * MUZZLE_OFFSET.forward + right[0] * MUZZLE_OFFSET.right,
      eye[1] + forward[1] * MUZZLE_OFFSET.forward - MUZZLE_OFFSET.down,
      eye[2] + forward[2] * MUZZLE_OFFSET.forward + right[2] * MUZZLE_OFFSET.right,
    ];
    result.impacts.forEach((impact, i) => {
      if (i < MAX_TRACERS_PER_SHOT) effects.tracer(muzzle, impact, definition.tracerColor, now);
      effects.spark(impact, result.impactOnPlayer[i], now);
    });
    viewModel.fire(now);
    pitch = Math.min(MAX_PITCH, pitch + definition.recoil);
    play(SOUND_BY_WEAPON[weapon]);
    // The last round reloads by itself.
    if (!hasRound(ammo, index)) startReload(now);
  };

  const placeCamera = () => {
    const eyeHeight = combat.alive ? PLAYER.eyeHeight : CAMERA.deadEyeHeight;
    eye[0] = body.position[0];
    eye[1] = body.position[1] + eyeHeight;
    eye[2] = body.position[2];
    camera.position.set(eye[0], eye[1], eye[2]);
    camera.rotation.set(pitch, yaw, combat.alive ? 0 : CAMERA.deadRoll);
  };

  /** Sends our pose at most 20 times a second, and only when it changed (or as a keepalive). */
  const sendPose = (now: number) => {
    if (connectionState !== 'open' || !myId || spectator) return;
    const elapsed = now - lastPoseSentAt;
    if (elapsed < RELAY_TIMING.snapshotIntervalMs) return;
    const pose: SentPose = {
      p: [round2(body.position[0]), round2(body.position[1]), round2(body.position[2])],
      y: round2(wrapAngle(yaw)),
      x: round2(pitch),
      w: weaponIndex(weapon),
    };
    const changed = !lastPoseSent
      || distanceXZ(pose.p, lastPoseSent.p) >= POSE_SEND.minMove
      || Math.abs(pose.p[1] - lastPoseSent.p[1]) >= POSE_SEND.minMove
      || Math.abs(wrapAngle(pose.y - lastPoseSent.y)) >= POSE_SEND.minTurn
      || Math.abs(pose.x - lastPoseSent.x) >= POSE_SEND.minTurn
      || pose.w !== lastPoseSent.w;
    if (!changed && elapsed < POSE_SEND.keepaliveMs) return;
    send({
      type: 'pose', p: pose.p, y: pose.y, x: pose.x, w: pose.w, on: true,
    });
    lastPoseSent = pose;
    lastPoseSentAt = now;
  };

  const refreshScoreboard = () => {
    if (!scoresChanged) return;
    scoresChanged = false;
    const rows = scoreboardRows(scores);
    if (!sameRows(rows, scoreboard)) scoreboard = rows;
  };

  const updateHud = (locked: boolean, showScoreboard: boolean, now: number) => {
    feed = pruneFeed(feed, now);
    refreshScoreboard();
    const own = myId ? scores.get(myId) : undefined;
    const index = weaponIndex(weapon);
    hud.setState({
      locked,
      health: combat.health,
      alive: combat.alive,
      weapon,
      scoped: zoom >= SCOPE_LENS_AT,
      mag: ammo[index]?.mag ?? 0,
      reserve: ammo[index]?.reserve ?? 0,
      reloading: reloadWeapon !== NO_RELOAD,
      lowAmmo: lowOnAmmo(ammo, index),
      kills: own?.kills ?? 0,
      deaths: own?.deaths ?? 0,
      killer: combat.lastKiller,
      respawnIn: respawnInSeconds(combat, now),
      feed,
      scoreboard,
      showScoreboard: showScoreboard || !locked,
      hitMarker,
      hitMarkerSeq,
      damageSeq,
      muted,
      connection: connectionState,
    });
  };

  const frame = () => {
    const now = performance.now();
    const dt = Math.min(MAX_FRAME_DT, (now - lastFrame) / 1000);
    lastFrame = now;
    const controls = input.read();

    followRound();
    const relayNow = connection?.clock.relayNow(now) ?? null;
    renderTime = relayNow === null ? null : relayNow - RELAY_TIMING.interpolationDelayMs;
    if (controls.locked) look(controls.lookX, controls.lookY);
    if (controls.weaponSlot !== null) switchWeapon(weaponAt(controls.weaponSlot), now);
    if (controls.weaponStep) switchWeapon(cycleWeapon(weapon, controls.weaponStep), now);
    updateZoom(controls.aiming && controls.locked, dt, now);
    if (controls.reload && controls.locked && combat.alive && !spectator) startReload(now);
    updateReload(now);
    if (controls.toggleMute) {
      muted = !muted;
      audio.setMuted(muted);
    }

    if (combat.alive) {
      const intent: MoveIntent = controls.locked
        ? {
          forward: controls.forward,
          strafe: controls.strafe,
          jump: controls.jump,
          walk: controls.walk || zoom > 0,
          yaw,
        }
        : {
          forward: 0, strafe: 0, jump: false, walk: false, yaw,
        };
      movePlayer(intent, dt);
      updatePickups(now);
    }

    const targets = updateRemotes(dt);
    placeCamera();
    if (controls.firing && controls.locked && combat.alive && !spectator) fire(targets, now);
    placeCamera();
    builtLevel.animate(now, camera.position);
    viewModel.update(
      dt,
      Math.hypot(body.velocity[0], body.velocity[2]),
      now,
      combat.alive && zoom < SCOPE_LENS_AT,
    );
    effects.update(now);
    sendPose(now);
    updateHud(controls.locked, controls.scoreboard, now);
    renderer.render(scene, camera);
  };

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(getContext().renderScale * Math.min(window.devicePixelRatio || 1, 1));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const requestPlay = () => {
    audio.resume();
    input.requestLock();
  };
  canvas.addEventListener('click', requestPlay);

  placeLocally();
  renderer.setAnimationLoop(frame);

  return {
    requestPlay,
    dispose: () => {
      renderer.setAnimationLoop(null);
      // Closing the socket is what takes us out of the room for everyone else.
      disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener('click', requestPlay);
      input.dispose();
      audio.dispose();
      effects.dispose();
      remotes.forEach((remote) => remote.avatar.dispose());
      remotes.clear();
      crowd.dispose();
      viewModel.dispose();
      disposeScene(scene);
      renderer.dispose();
      canvas.remove();
    },
  };
};
