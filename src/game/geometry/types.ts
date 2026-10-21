import { Vec3 } from '../../commons/types';

/** Axis-aligned box, meters. */
export interface Aabb {
  min: Vec3;
  max: Vec3;
}
