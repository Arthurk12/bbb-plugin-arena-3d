import type { Group } from 'three';
import { Vec3 } from '../../commons/types';
import { Aabb } from '../geometry/types';

export type MaterialId =
  | 'floor' | 'wall' | 'concrete' | 'metal' | 'crate' | 'pad' | 'slime' | 'neonPink' | 'neonCyan';

/** A solid box. */
export interface LevelBlock extends Aabb {
  material: MaterialId;
}

/** Standing on top of the pad's box launches the player with `launch` (m/s). */
export interface JumpPad extends Aabb {
  launch: Vec3;
}

/** Feet inside the volume lose health over time. */
export interface Hazard extends Aabb {
  damagePerSecond: number;
}

export interface PickupDefinition {
  position: Vec3;
  heal: number;
}

export interface SpawnPoint {
  position: Vec3;
  /** Facing, radians (0 looks towards -z). */
  yaw: number;
}

export interface LevelDefinition {
  /** Solid boxes, pads included. */
  blocks: LevelBlock[];
  pads: JumpPad[];
  hazards: Hazard[];
  /** Drawn but not solid (slime surface, neon strips). */
  decor: LevelBlock[];
  pickups: PickupDefinition[];
  spawns: SpawnPoint[];
  /** Below this height a player dies. */
  killY: number;
}

export type StairsDirection = '+x' | '-x' | '+z' | '-z';

export interface StairsOptions {
  /** Where the bottom step starts, along the climbing axis. */
  foot: number;
  /** Centre of the stairs across the climbing axis. */
  across: number;
  direction: StairsDirection;
  width: number;
  steps: number;
  rise: number;
  run: number;
  baseY: number;
  material: MaterialId;
}

/** The level's meshes, ready to add to a scene. */
export interface BuiltLevel {
  group: Group;
  /** One mesh per pickup, in the order of `LevelDefinition.pickups`. */
  pickups: Group[];
}
