import type { BufferGeometry } from 'three';
import { Pose } from '../../commons/types';

export interface AvatarFrame {
  pose: Pose;
  /** Horizontal speed, m/s, for the walk animation. */
  speed: number;
  alive: boolean;
  /** Index of the weapon in hand (in WEAPON_IDS). */
  weapon: number;
  dt: number; // seconds
  now: number; // ms
  /** Distance from the local player, meters: far name tags are hidden. */
  viewerDistance: number;
}

/** One remote player inside the crowd. */
export interface RemoteAvatar {
  update: (frame: AvatarFrame) => void;
  setName: (name: string, color: string) => void;
  /** Shows the muzzle flash. */
  flash: (now: number) => void;
  /** World position of the gun's muzzle. */
  muzzlePosition: () => [number, number, number];
  /** Takes the player out of the crowd. */
  dispose: () => void;
}

/** Every remote player, drawn with one instanced mesh per body part. */
export interface AvatarCrowd {
  add: (userId: string) => RemoteAvatar;
  /** Players drawn right now. */
  size: () => number;
  dispose: () => void;
}

/** Geometry of each body part, around its own pivot, with baked colors and tint. */
export interface AvatarPartGeometries {
  leg: BufferGeometry;
  torso: BufferGeometry;
  head: BufferGeometry;
  arms: BufferGeometry;
}
