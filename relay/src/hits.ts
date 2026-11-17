import { seededRandom } from '../../src/commons/random';
import { NO_RELOAD } from '../../src/game/ammo/constants';
import { hasRound } from '../../src/game/ammo/service';
import { createHitbox, writeHitbox } from '../../src/game/hitbox/service';
import { PLAYER } from '../../src/game/player/constants';
import { WEAPON_IDS, WEAPONS } from '../../src/game/weapons/constants';
import {
  pelletDirections, resolveShot, shotSpread, weaponAt,
} from '../../src/game/weapons/service';
import { ShotTarget } from '../../src/game/weapons/types';
import { RELAY_LIMITS, RELAY_TIMING } from '../../src/protocol/constants';
import { ShotMessage } from '../../src/protocol/types';
import { SHOT_COOLDOWN_TOLERANCE } from './constants';
import { sampleHistory } from './history';
import { ShotContext, ShotVerdict } from './types';

/**
 * The relay time a shot is checked at. The client says what it saw (`vt`), but a shot is only
 * trusted when it agrees with what the measured RTT predicts; otherwise the relay assumes the
 * usual delay. Never older than `maxRewindMs`, so lag cannot buy unlimited rewinding.
 */
export const effectiveViewTime = (vt: number, now: number, rttMs: number): number => {
  const expected = now - rttMs / 2 - RELAY_TIMING.interpolationDelayMs;
  const consistent = vt <= now && Math.abs(vt - expected) <= RELAY_TIMING.viewTimeToleranceMs;
  const chosen = consistent ? vt : expected;
  return Math.max(chosen, now - RELAY_TIMING.maxRewindMs);
};

/**
 * Server-side check of a shot: who it may hit and where it stops. The order of the checks
 * decides which reason a rejected shot gets, so keep them as they are.
 */
export const evaluateShot = (shot: ShotMessage, ctx: ShotContext): ShotVerdict => {
  const { shooter } = ctx;
  if (shooter.spectator) {
    return { ok: false, reason: 'spectator' };
  }
  if (!shooter.combat.alive) {
    return { ok: false, reason: 'dead' };
  }
  if (shot.w >= WEAPON_IDS.length) {
    return { ok: false, reason: 'weapon' };
  }
  if (shooter.reloadWeapon !== NO_RELOAD) {
    return { ok: false, reason: 'reloading' };
  }
  if (!hasRound(shooter.ammo, shot.w)) {
    return { ok: false, reason: 'ammo' };
  }
  const weapon = WEAPONS[weaponAt(shot.w)];
  if (ctx.now - shooter.lastShotAt < weapon.cooldownMs * SHOT_COOLDOWN_TOLERANCE) {
    return { ok: false, reason: 'cooldown' };
  }
  const [ex, ey, ez] = [shooter.p[0], shooter.p[1] + PLAYER.eyeHeight, shooter.p[2]];
  const [ox, oy, oz] = shot.o;
  if (Math.hypot(ox - ex, oy - ey, oz - ez) > RELAY_LIMITS.maxShotOriginOffset) {
    return { ok: false, reason: 'origin' };
  }

  const viewTime = effectiveViewTime(shot.vt, ctx.now, ctx.rttMs);
  const targets: ShotTarget[] = [];
  ctx.others.forEach((other) => {
    if (other.spectator || !other.on || !other.combat.alive) return;
    const sample = sampleHistory(other.history, viewTime);
    if (!sample || !sample.alive || sample.life !== other.life) return;
    const hitbox = writeHitbox({ p: sample.p, y: sample.y, x: sample.x }, createHitbox());
    targets.push({ userId: other.userId, hitbox });
  });

  const directions = pelletDirections(
    shot.y,
    shot.x,
    weapon.pellets,
    shotSpread(weapon, shot.ads),
    seededRandom(shot.seed),
  );
  const result = resolveShot(shot.o, directions, ctx.level.blocks, targets, weapon);
  return { ok: true, viewTime, result };
};
