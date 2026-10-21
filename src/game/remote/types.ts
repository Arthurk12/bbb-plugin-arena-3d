import type { Group } from 'three';
import { Pose } from '../../net/types';

export interface AvatarFrame {
  pose: Pose;
  /** Horizontal speed, m/s, for the walk animation. */
  speed: number;
  alive: boolean;
  dt: number; // seconds
  now: number; // ms
}

export interface RemoteAvatar {
  group: Group;
  update: (frame: AvatarFrame) => void;
  setName: (name: string, color: string) => void;
  /** Shows the muzzle flash. */
  flash: (now: number) => void;
  /** World position of the gun's muzzle. */
  muzzlePosition: () => [number, number, number];
  dispose: () => void;
}
