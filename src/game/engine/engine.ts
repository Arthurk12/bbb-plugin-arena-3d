import * as THREE from 'three';
import { Vec3 } from '../../commons/types';
import { clamp } from '../../commons/utils';
import { DATA_TEST } from '../../commons/constants';
import { computeScores, recentHits, toWireHits } from '../../net/service';
import { LocalHit, PlayerPayload, Pose } from '../../net/types';
import {
  canHeal, createCombatState, heal, resetForRound, respawn, respawnDue, respawnInSeconds,
  restoreScore, takeDamage,
} from '../combat/service';
import { PICKUP_RADIUS, PICKUP_RESPAWN_MS } from '../combat/constants';
import { CombatState } from '../combat/types';
import { createArenaAudio } from '../effects/audio';
import { HEARING_DISTANCE, MUZZLE_OFFSET, REMOTE_TRACER_RANGE } from '../effects/constants';
import { createEffects } from '../effects/effects';
import { SoundId } from '../effects/types';
import {
  createAabb, distanceXZ, pointAlong, rayBoxes,
} from '../geometry/service';
import {
  appendFeed, pruneFeed, sameRows, scoreboardRows,
} from '../hud/service';
import { SCOREBOARD_REFRESH_MS } from '../hud/constants';
import { FeedItem, HitMarker, ScoreRow } from '../hud/types';
import { createInputController } from '../input/controller';
import { MAX_PITCH, MOUSE_SENSITIVITY } from '../input/constants';
import { buildLevel } from '../level/builder';
import { FOG, LIGHTS, SKY_COLOR } from '../level/constants';
import { ARENA_LEVEL } from '../level/layout';
import { pickSpawn } from '../level/service';
import { PLAYER } from '../player/constants';
import { stepPlayer } from '../player/service';
import { CollisionWorld, MoveIntent, PlayerBody } from '../player/types';
import { createRemoteAvatar } from '../remote/avatar';
import { writeHitboxes } from '../remote/service';
import { RemoteAvatar } from '../remote/types';
import { WEAPONS } from '../weapons/constants';
import {
  aimDirection, canFire, cycleWeapon, pelletDirections, resolveShot, weaponAt, weaponIndex,
} from '../weapons/service';
import { ShotTarget, WeaponId } from '../weapons/types';
import { createViewModel } from '../weapons/view-model';
import {
  CAMERA, LETHAL_DAMAGE, MAX_FRAME_DT, MAX_TRACERS_PER_SHOT, PICKUP_REACH_HEIGHT, PICKUP_SPIN,
  SPEED_SMOOTHING,
} from './constants';
import { ArenaEngine, EngineOptions } from './types';

interface RemoteEntry {
  avatar: RemoteAvatar;
  pose: Pose;
  previous: Vec3 | null;
  speed: number;
  target: ShotTarget;
}

const IDLE_ENGINE: ArenaEngine = { requestPlay: () => {}, dispose: () => {} };

const SOUND_BY_WEAPON: Record<WeaponId, SoundId> = { blaster: 'blaster', shotgun: 'shotgun' };

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

/**
 * The game: one three.js scene and one animation loop, entirely outside React. It reads the
 * meeting through `getContext` and the net, and reports to React only through the HUD store.
 */
export const createArenaEngine = ({
  container, net, hud, getContext, onWebglError,
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
  scene.fog = new THREE.Fog(SKY_COLOR, FOG.near, FOG.far);
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
  const effects = createEffects(scene);
  const audio = createArenaAudio();
  const input = createInputController(canvas);

  const body: PlayerBody = { position: [0, 0, 0], velocity: [0, 0, 0], grounded: false };
  let yaw = 0;
  let pitch = 0;
  let combat: CombatState = createCombatState(performance.now());
  let weapon: WeaponId = 'blaster';
  let lastShotAt = -Infinity;
  let shots = 0;
  let hitSeq = 0;
  let localHits: LocalHit[] = [];
  let hazardDamage = 0;
  let muted = false;
  let currentRound: string | null = net.getRound();
  const pickupAvailableAt = level.pickups.map(() => 0);
  const remotes = new Map<string, RemoteEntry>();
  let feed: FeedItem[] = [];
  let feedId = 0;
  let hitMarker: HitMarker = 'hit';
  let hitMarkerSeq = 0;
  let damageSeq = 0;
  let scoreboard: ScoreRow[] = [];
  let kills = 0;
  let scoreboardAt = -Infinity;
  let lastFrame = performance.now();
  const eye: Vec3 = [0, 0, 0];

  const play = (sound: SoundId, volume?: number) => audio.play(sound, volume);

  const volumeAt = (position: Vec3) => (
    1 - Math.min(1, distanceXZ(position, body.position) / HEARING_DISTANCE)
  );

  const spawn = (now: number) => {
    const others = [...remotes.values()].map((remote) => remote.pose.p);
    const point = pickSpawn(level.spawns, others, Math.random);
    body.position = [...point.position];
    body.velocity = [0, 0, 0];
    body.grounded = false;
    ({ yaw } = point);
    pitch = 0;
    combat = respawn(combat, now);
    hazardDamage = 0;
  };

  const pushFeed = (killer: string, victim: string, now: number) => {
    feedId += 1;
    feed = appendFeed(feed, {
      id: feedId, killer, victim, at: now,
    });
  };

  const applyDamage = (amount: number, sourceId: string, now: number) => {
    const selfId = getContext().currentUserId;
    if (!selfId) return;
    const outcome = takeDamage(combat, amount, sourceId, selfId, now);
    combat = outcome.state;
    if (outcome.taken > 0) damageSeq += 1;
    if (outcome.died) {
      play('death');
      pushFeed(sourceId, selfId, now);
    } else if (outcome.taken > 0) {
      play('pain');
    }
  };

  const handleRoundAndRestore = (now: number) => {
    const round = net.getRound();
    if (round !== currentRound) {
      currentRound = round;
      combat = resetForRound(now);
      localHits = [];
      feed = [];
      spawn(now);
    }
    const restored = net.takeRestoredOwn();
    if (!restored) return;
    shots = Math.max(shots, restored.s);
    hitSeq = Math.max(hitSeq, restored.hn);
    if (restored.r === currentRound) combat = restoreScore(combat, restored);
  };

  const look = (lookX: number, lookY: number) => {
    yaw -= lookX * MOUSE_SENSITIVITY;
    pitch = clamp(pitch - lookY * MOUSE_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
  };

  const switchWeapon = (next: WeaponId) => {
    if (next === weapon) return;
    weapon = next;
    viewModel.setWeapon(weapon);
  };

  const movePlayer = (intent: MoveIntent, dt: number, now: number) => {
    const events = stepPlayer(body, intent, dt, world);
    if (events.jumped) play('jump');
    if (events.launched) play('pad');
    hazardDamage += events.hazardDamage;
    if (hazardDamage >= 1) {
      const whole = Math.floor(hazardDamage);
      hazardDamage -= whole;
      applyDamage(whole, getContext().currentUserId ?? '', now);
    }
    if (body.position[1] < level.killY) {
      applyDamage(LETHAL_DAMAGE, getContext().currentUserId ?? '', now);
    }
  };

  const updatePickups = (dt: number, now: number) => {
    level.pickups.forEach((pickup, i) => {
      const mesh = builtLevel.pickups[i];
      const available = now >= pickupAvailableAt[i];
      mesh.visible = available;
      mesh.rotation.y += PICKUP_SPIN * dt;
      if (!available || !canHeal(combat)) return;
      const near = distanceXZ(pickup.position, body.position) < PICKUP_RADIUS
        && Math.abs(body.position[1] - pickup.position[1]) < PICKUP_REACH_HEIGHT;
      if (!near) return;
      combat = heal(combat, pickup.heal);
      pickupAvailableAt[i] = now + PICKUP_RESPAWN_MS;
      play('pickup');
    });
  };

  /** Draws remote players at their interpolated pose; returns the ones a shot can hit. */
  const updateRemotes = (dt: number, now: number): ShotTarget[] => {
    const context = getContext();
    const others = Math.max(0, context.maxPlayers - 1);
    const ids = net.activeUserIds(now)
      .map((userId) => ({ userId, latest: net.latest(userId)! }))
      .sort((a, b) => distanceXZ(a.latest.p, body.position) - distanceXZ(b.latest.p, body.position))
      .slice(0, others);
    const keep = new Set(ids.map(({ userId }) => userId));
    [...remotes.entries()].forEach(([userId, remote]) => {
      if (keep.has(userId)) return;
      scene.remove(remote.avatar.group);
      remote.avatar.dispose();
      remotes.delete(userId);
    });

    const targets: ShotTarget[] = [];
    ids.forEach(({ userId, latest }) => {
      let remote = remotes.get(userId);
      if (!remote) {
        const avatar = createRemoteAvatar(userId);
        scene.add(avatar.group);
        remote = {
          avatar,
          pose: { p: [0, 0, 0], y: 0, x: 0 },
          previous: null,
          speed: 0,
          target: { userId, body: createAabb(), head: createAabb() },
        };
        remotes.set(userId, remote);
      }
      if (!net.sample(userId, now, remote.pose)) return;
      const { pose } = remote;
      const moved = remote.previous && dt > 0 ? distanceXZ(remote.previous, pose.p) / dt : 0;
      remote.speed = remote.speed * SPEED_SMOOTHING + moved * (1 - SPEED_SMOOTHING);
      remote.previous = [...pose.p];
      const alive = latest.h > 0;
      remote.avatar.update({
        pose, speed: remote.speed, alive, dt, now,
      });
      const user = context.users[userId];
      remote.avatar.setName(user?.name ?? context.fallbackName, user?.color ?? '#ffffff');
      if (!alive) return;
      writeHitboxes(pose, remote.target.body, remote.target.head);
      targets.push(remote.target);
    });
    return targets;
  };

  const handleRemoteEvents = (now: number) => {
    const selfId = getContext().currentUserId;
    net.drainIncomingHits().forEach((hit) => applyDamage(hit.damage, hit.from, now));
    net.drainFrags().forEach((frag) => {
      pushFeed(frag.killer, frag.victim, now);
      if (selfId && frag.killer === selfId && frag.victim !== selfId) play('frag');
    });
    net.drainShots().forEach(({ userId }) => {
      const remote = remotes.get(userId);
      const latest = net.latest(userId);
      if (!remote || !latest) return;
      remote.avatar.flash(now);
      const from = remote.avatar.muzzlePosition();
      const dir = aimDirection(remote.pose.y, remote.pose.x);
      const distance = rayBoxes(from, dir, world.solids, REMOTE_TRACER_RANGE);
      const remoteWeapon = weaponAt(latest.w);
      effects.tracer(from, pointAlong(from, dir, distance), WEAPONS[remoteWeapon].tracerColor, now);
      play(SOUND_BY_WEAPON[remoteWeapon], volumeAt(from));
    });
  };

  const fire = (targets: ShotTarget[], now: number) => {
    const definition = WEAPONS[weapon];
    if (!canFire(lastShotAt, now, definition)) return;
    lastShotAt = now;
    shots += 1;
    const directions = pelletDirections(yaw, pitch, definition, Math.random);
    const result = resolveShot(eye, directions, world.solids, targets, definition);
    result.damageByUser.forEach((damage, userId) => {
      hitSeq += 1;
      localHits.push({
        n: hitSeq, u: userId, d: Math.round(damage), at: now,
      });
    });
    if (result.damageByUser.size) {
      hitMarker = result.headshot ? 'head' : 'hit';
      hitMarkerSeq += 1;
      play(result.headshot ? 'headshot' : 'hit');
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
  };

  const placeCamera = () => {
    const eyeHeight = combat.alive ? PLAYER.eyeHeight : CAMERA.deadEyeHeight;
    eye[0] = body.position[0];
    eye[1] = body.position[1] + eyeHeight;
    eye[2] = body.position[2];
    camera.position.set(eye[0], eye[1], eye[2]);
    camera.rotation.set(pitch, yaw, combat.alive ? 0 : CAMERA.deadRoll);
  };

  const publish = (now: number) => {
    if (!currentRound) return;
    localHits = recentHits(localHits, now);
    const payload: PlayerPayload = {
      r: currentRound,
      on: true,
      p: [...body.position],
      y: yaw,
      x: pitch,
      h: combat.health,
      w: weaponIndex(weapon),
      s: shots,
      t: 0,
      hn: hitSeq,
      dt: combat.deaths,
      lk: combat.lastKiller,
      kb: combat.killedBy,
      hits: toWireHits(localHits),
    };
    net.publishLocal(payload, now);
  };

  const refreshScoreboard = (now: number) => {
    if (now - scoreboardAt < SCOREBOARD_REFRESH_MS) return;
    scoreboardAt = now;
    const selfId = getContext().currentUserId;
    const snapshots = net.roundSnapshots();
    const local = net.getLocal();
    if (selfId && local) snapshots.set(selfId, local);
    const rows = scoreboardRows(computeScores(snapshots));
    kills = rows.find((row) => row.userId === selfId)?.kills ?? 0;
    if (!sameRows(rows, scoreboard)) scoreboard = rows;
  };

  const updateHud = (locked: boolean, showScoreboard: boolean, now: number) => {
    feed = pruneFeed(feed, now);
    refreshScoreboard(now);
    hud.setState({
      locked,
      health: combat.health,
      alive: combat.alive,
      weapon,
      kills,
      deaths: combat.deaths,
      killer: combat.lastKiller,
      respawnIn: respawnInSeconds(combat, now),
      feed,
      scoreboard,
      showScoreboard: showScoreboard || !locked,
      hitMarker,
      hitMarkerSeq,
      damageSeq,
      muted,
    });
  };

  const frame = () => {
    const now = performance.now();
    const dt = Math.min(MAX_FRAME_DT, (now - lastFrame) / 1000);
    lastFrame = now;
    const controls = input.read();

    handleRoundAndRestore(now);
    if (controls.locked) look(controls.lookX, controls.lookY);
    if (controls.weaponSlot !== null) switchWeapon(weaponAt(controls.weaponSlot));
    if (controls.weaponStep) switchWeapon(cycleWeapon(weapon, controls.weaponStep));
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
          walk: controls.walk,
          yaw,
        }
        : {
          forward: 0, strafe: 0, jump: false, walk: false, yaw,
        };
      movePlayer(intent, dt, now);
      updatePickups(dt, now);
    } else if (respawnDue(combat, now)) {
      spawn(now);
      play('respawn');
    }

    const targets = updateRemotes(dt, now);
    handleRemoteEvents(now);
    placeCamera();
    if (controls.firing && controls.locked && combat.alive) fire(targets, now);
    placeCamera();
    viewModel.update(dt, Math.hypot(body.velocity[0], body.velocity[2]), now, combat.alive);
    effects.update(now);
    publish(now);
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

  spawn(performance.now());
  renderer.setAnimationLoop(frame);

  return {
    requestPlay,
    dispose: () => {
      renderer.setAnimationLoop(null);
      const local = net.getLocal();
      // Others stop drawing us right away instead of waiting for the entry to go stale.
      if (local) net.publishLocal({ ...local, on: false }, performance.now(), true);
      resizeObserver.disconnect();
      canvas.removeEventListener('click', requestPlay);
      input.dispose();
      audio.dispose();
      effects.dispose();
      remotes.forEach((remote) => remote.avatar.dispose());
      remotes.clear();
      viewModel.dispose();
      disposeScene(scene);
      renderer.dispose();
      canvas.remove();
    },
  };
};
