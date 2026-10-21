import { hashString } from '../../commons/utils';
import { Aabb } from '../geometry/types';
import { Pose } from '../../net/types';
import { HITBOX } from './constants';

const HUE_STEPS = 360;

/** Torso hue derived from the user id: the same on every client. */
export const userHue = (userId: string): number => (hashString(userId) % HUE_STEPS) / HUE_STEPS;

/** Body and head boxes of a player standing at `pose`, written into the given boxes. */
export const writeHitboxes = (pose: Pose, body: Aabb, head: Aabb): void => {
  const [x, y, z] = pose.p;
  body.min[0] = x - HITBOX.bodyHalfWidth;
  body.min[1] = y;
  body.min[2] = z - HITBOX.bodyHalfWidth;
  body.max[0] = x + HITBOX.bodyHalfWidth;
  body.max[1] = y + HITBOX.bodyHeight;
  body.max[2] = z + HITBOX.bodyHalfWidth;
  head.min[0] = x - HITBOX.headHalfWidth;
  head.min[1] = y + HITBOX.bodyHeight;
  head.min[2] = z - HITBOX.headHalfWidth;
  head.max[0] = x + HITBOX.headHalfWidth;
  head.max[1] = y + HITBOX.bodyHeight + HITBOX.headHeight;
  head.max[2] = z + HITBOX.headHalfWidth;
};

export const truncateName = (name: string, maxChars: number): string => (
  name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name
);
