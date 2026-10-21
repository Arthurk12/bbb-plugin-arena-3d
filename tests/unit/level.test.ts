import { describe, expect, it } from 'vitest';
import { ARENA_LEVEL } from '../../src/game/level/layout';
import { pickSpawn } from '../../src/game/level/service';
import {
  aabbOverlap, boxAt, createAabb, distanceXZ,
} from '../../src/game/geometry/service';
import { PLAYER } from '../../src/game/player/constants';
import { stepPlayer } from '../../src/game/player/service';
import { Vec3 } from '../../src/commons/types';

const MIN_PICKUP_SPAWN_GAP = 3; // meters

const world = {
  solids: ARENA_LEVEL.blocks, pads: ARENA_LEVEL.pads, hazards: ARENA_LEVEL.hazards,
};

const insideSolid = (feet: Vec3) => {
  const box = boxAt(feet, PLAYER.halfWidth, PLAYER.height, createAabb());
  return ARENA_LEVEL.blocks.some((solid) => aabbOverlap(box, solid));
};

describe('ARENA_LEVEL', () => {
  it('spawns nobody inside a wall, and on solid ground', () => {
    ARENA_LEVEL.spawns.forEach((spawn) => {
      expect(insideSolid(spawn.position)).toBe(false);
      const below: Vec3 = [spawn.position[0], spawn.position[1] - 0.05, spawn.position[2]];
      expect(insideSolid(below)).toBe(true);
    });
  });

  it('puts every pickup within reach, not inside a wall', () => {
    ARENA_LEVEL.pickups.forEach((pickup) => {
      expect(insideSolid(pickup.position)).toBe(false);
    });
  });

  it('keeps pickups away from spawns, so nobody heals just by respawning', () => {
    ARENA_LEVEL.pickups.forEach((pickup) => {
      ARENA_LEVEL.spawns.forEach((spawn) => {
        expect(distanceXZ(pickup.position, spawn.position)).toBeGreaterThan(MIN_PICKUP_SPAWN_GAP);
      });
    });
  });

  it('jump pads land you on the ledge they face', () => {
    ARENA_LEVEL.pads.forEach((pad) => {
      const center: Vec3 = [(pad.min[0] + pad.max[0]) / 2, pad.max[1], 0];
      const body = { position: center, velocity: [0, 0, 0] as Vec3, grounded: true };
      for (let t = 0; t < 3; t += 1 / 60) {
        stepPlayer(body, {
          forward: 0, strafe: 0, jump: false, walk: false, yaw: 0,
        }, 1 / 60, world);
      }
      expect(body.position[1]).toBeCloseTo(6, 1);
    });
  });
});

describe('pickSpawn', () => {
  it('picks the spawn farthest from the other players', () => {
    const spawns = [
      { position: [0, 0, 0] as Vec3, yaw: 0 },
      { position: [20, 0, 0] as Vec3, yaw: 0 },
    ];
    expect(pickSpawn(spawns, [[1, 0, 0]], () => 0).position[0]).toBe(20);
    expect(pickSpawn(spawns, [], () => 0.9).position[0]).toBe(20);
  });
});
