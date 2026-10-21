import { Vec3 } from '../../commons/types';
import { distanceXZ } from '../geometry/service';
import {
  LevelBlock, MaterialId, SpawnPoint, StairsOptions,
} from './types';

export const block = (min: Vec3, max: Vec3, material: MaterialId): LevelBlock => ({
  min, max, material,
});

/** A box `size` wide/high/deep standing on `feet` (bottom-centre). */
export const boxOn = (feet: Vec3, size: Vec3, material: MaterialId): LevelBlock => block(
  [feet[0] - size[0] / 2, feet[1], feet[2] - size[2] / 2],
  [feet[0] + size[0] / 2, feet[1] + size[1], feet[2] + size[2] / 2],
  material,
);

/** Solid steps climbing along `direction`, the first one starting at `foot`. */
export const stairs = ({
  foot, across, direction, width, steps, rise, run, baseY, material,
}: StairsOptions): LevelBlock[] => {
  const sign = direction[0] === '+' ? 1 : -1;
  const alongX = direction[1] === 'x';
  return Array.from({ length: steps }, (_, i) => {
    const a = foot + sign * run * i;
    const b = foot + sign * run * (i + 1);
    const along: [number, number] = [Math.min(a, b), Math.max(a, b)];
    const side: [number, number] = [across - width / 2, across + width / 2];
    const top = baseY + rise * (i + 1);
    return alongX
      ? block([along[0], baseY, side[0]], [along[1], top, side[1]], material)
      : block([side[0], baseY, along[0]], [side[1], top, along[1]], material);
  });
};

/** The spawn point farthest from every other player (any spawn when alone). */
export const pickSpawn = (
  spawns: SpawnPoint[],
  others: Vec3[],
  random: () => number,
): SpawnPoint => {
  if (!others.length) return spawns[Math.floor(random() * spawns.length)];
  let best = spawns[0];
  let bestDistance = -Infinity;
  spawns.forEach((spawn) => {
    const nearest = Math.min(...others.map((other) => distanceXZ(spawn.position, other)));
    if (nearest > bestDistance) {
      best = spawn;
      bestDistance = nearest;
    }
  });
  return best;
};
