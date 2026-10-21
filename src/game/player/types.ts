import { Vec3 } from '../../commons/types';
import { Aabb } from '../geometry/types';
import { Hazard, JumpPad } from '../level/types';

export interface PlayerBody {
  /** Feet (bottom-centre), meters. */
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
}

export interface MoveIntent {
  /** -1 (back) to 1 (forward). */
  forward: number;
  /** -1 (left) to 1 (right). */
  strafe: number;
  jump: boolean;
  walk: boolean;
  yaw: number;
}

export interface CollisionWorld {
  solids: Aabb[];
  pads: JumpPad[];
  hazards: Hazard[];
}

export interface StepEvents {
  jumped: boolean;
  launched: boolean;
  landed: boolean;
  hazardDamage: number;
}
