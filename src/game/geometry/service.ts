import { Vec3 } from '../../commons/types';
import { Aabb } from './types';

export const aabbOverlap = (a: Aabb, b: Aabb): boolean => (
  a.min[0] < b.max[0] && a.max[0] > b.min[0]
  && a.min[1] < b.max[1] && a.max[1] > b.min[1]
  && a.min[2] < b.max[2] && a.max[2] > b.min[2]
);

/** A box standing on `feet` (bottom-centre), written into `out`. */
export const boxAt = (
  feet: Vec3,
  halfWidth: number,
  height: number,
  out: Aabb,
  bottomOffset = 0,
): Aabb => {
  out.min[0] = feet[0] - halfWidth;
  out.min[1] = feet[1] + bottomOffset;
  out.min[2] = feet[2] - halfWidth;
  out.max[0] = feet[0] + halfWidth;
  out.max[1] = feet[1] + bottomOffset + height;
  out.max[2] = feet[2] + halfWidth;
  return out;
};

export const createAabb = (): Aabb => ({ min: [0, 0, 0], max: [0, 0, 0] });

/**
 * Distance along a ray (unit `dir`) to where it enters `box`, or null when it misses it
 * within `maxDistance`. A ray starting inside the box hits it at 0.
 */
export const rayAabb = (
  origin: Vec3,
  dir: Vec3,
  box: Aabb,
  maxDistance: number,
): number | null => {
  let tMin = 0;
  let tMax = maxDistance;
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(dir[axis]) < 1e-9) {
      if (origin[axis] < box.min[axis] || origin[axis] > box.max[axis]) return null;
    } else {
      const inv = 1 / dir[axis];
      let t1 = (box.min[axis] - origin[axis]) * inv;
      let t2 = (box.max[axis] - origin[axis]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }
  return tMin;
};

/** Nearest distance at which the ray enters any of the boxes, capped at `maxDistance`. */
export const rayBoxes = (
  origin: Vec3,
  dir: Vec3,
  boxes: Aabb[],
  maxDistance: number,
): number => boxes.reduce((nearest, box) => {
  const t = rayAabb(origin, dir, box, nearest);
  return t === null ? nearest : Math.min(nearest, t);
}, maxDistance);

export const pointAlong = (origin: Vec3, dir: Vec3, distance: number): Vec3 => [
  origin[0] + dir[0] * distance,
  origin[1] + dir[1] * distance,
  origin[2] + dir[2] * distance,
];

export const distanceXZ = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[2] - b[2]);
