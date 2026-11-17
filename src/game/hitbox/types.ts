import { Vec3 } from '../../commons/types';
import { Aabb } from '../geometry/types';
import { HIT_ZONES } from './constants';

export type HitZone = typeof HIT_ZONES[number];

/** A zone's box, in the frame of the body part that carries it. */
export interface ZoneBox {
  zone: HitZone;
  /** The part's pivot, meters above the feet. */
  pivotHeight: number;
  /** Turn of the part around x at pitch 0, radians. */
  restAngle: number;
  /** Whether the part also turns with the player's pitch. */
  followsPitch: boolean;
  box: Aabb;
}

/** A player's body as a shot sees it; updated in place, never reallocated. */
export interface Hitbox {
  /** Feet position. */
  p: Vec3;
  /** Yaw, radians. */
  y: number;
  /** Pitch, radians. */
  x: number;
  /** Around every zone, in world space. */
  bounds: Aabb;
}

export interface ZoneHit {
  /** Distance along the ray, meters. */
  distance: number;
  zone: HitZone;
}
