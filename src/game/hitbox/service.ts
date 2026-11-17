import { Pose, Vec3 } from '../../commons/types';
import { boxAt, createAabb, rayAabb } from '../geometry/service';
import { HIT_ZONES, HITBOX_BOUNDS, ZONE_BOXES } from './constants';
import { Hitbox, HitZone, ZoneHit } from './types';

export const createHitbox = (): Hitbox => ({
  p: [0, 0, 0], y: 0, x: 0, bounds: createAabb(),
});

/** Moves `out` to a player standing at `pose`. */
export const writeHitbox = (pose: Pose, out: Hitbox): Hitbox => {
  out.p[0] = pose.p[0];
  out.p[1] = pose.p[1];
  out.p[2] = pose.p[2];
  // eslint-disable-next-line no-param-reassign
  out.y = pose.y;
  // eslint-disable-next-line no-param-reassign
  out.x = pose.x;
  boxAt(out.p, HITBOX_BOUNDS.halfWidth, HITBOX_BOUNDS.height, out.bounds);
  return out;
};

export const zoneIndex = (zone: HitZone): number => HIT_ZONES.indexOf(zone);

/** The zone a protocol index names, or null (the level's own damage). */
export const zoneAt = (index: number): HitZone | null => HIT_ZONES[index] ?? null;

/** The more damaging of two zones: the one listed first in HIT_ZONES. */
export const worseZone = (a: HitZone, b: HitZone): HitZone => (
  zoneIndex(a) <= zoneIndex(b) ? a : b
);

// Scratch vectors, so testing a shot allocates nothing per zone.
const bodyOrigin: Vec3 = [0, 0, 0];
const bodyDir: Vec3 = [0, 0, 0];
const partOrigin: Vec3 = [0, 0, 0];
const partDir: Vec3 = [0, 0, 0];

/** `v` turned by -angle around y, into `out` (which may be `v`). */
const unturnY = (v: Vec3, angle: number, out: Vec3) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const x = c * v[0] - s * v[2];
  const z = s * v[0] + c * v[2];
  out[0] = x;
  out[1] = v[1];
  out[2] = z;
};

/** `v` turned by -angle around x, into `out` (which may be `v`). */
const unturnX = (v: Vec3, angle: number, out: Vec3) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const y = c * v[1] + s * v[2];
  const z = -s * v[1] + c * v[2];
  out[0] = v[0];
  out[1] = y;
  out[2] = z;
};

/**
 * Where a ray (unit `dir`) first enters a player's body and in which zone, or null when it
 * misses within `maxDistance`. Each zone is tested in its part's own frame, so the boxes turn
 * with the body and the aim exactly as the avatar is drawn; turning keeps lengths, so the
 * distances are the same as in the world.
 */
export const rayHitbox = (
  origin: Vec3,
  dir: Vec3,
  hitbox: Hitbox,
  maxDistance: number,
): ZoneHit | null => {
  if (rayAabb(origin, dir, hitbox.bounds, maxDistance) === null) return null;
  bodyOrigin[0] = origin[0] - hitbox.p[0];
  bodyOrigin[1] = origin[1] - hitbox.p[1];
  bodyOrigin[2] = origin[2] - hitbox.p[2];
  unturnY(bodyOrigin, hitbox.y, bodyOrigin);
  unturnY(dir, hitbox.y, bodyDir);

  let best: ZoneHit | null = null;
  for (let i = 0; i < ZONE_BOXES.length; i += 1) {
    const part = ZONE_BOXES[i];
    partOrigin[0] = bodyOrigin[0];
    partOrigin[1] = bodyOrigin[1] - part.pivotHeight;
    partOrigin[2] = bodyOrigin[2];
    const angle = part.restAngle + (part.followsPitch ? hitbox.x : 0);
    unturnX(partOrigin, angle, partOrigin);
    unturnX(bodyDir, angle, partDir);
    const distance = rayAabb(partOrigin, partDir, part.box, best ? best.distance : maxDistance);
    if (distance !== null && (!best || distance < best.distance)) {
      best = { distance, zone: part.zone };
    }
  }
  return best;
};
