import { aabbOverlap, boxAt, createAabb } from '../geometry/service';
import { Aabb } from '../geometry/types';
import { GROUND_EPSILON, PLAYER } from './constants';
import {
  CollisionWorld, MoveIntent, PlayerBody, StepEvents,
} from './types';

const probe = createAabb();

const collisions = (body: PlayerBody, solids: Aabb[], out: Aabb[]): Aabb[] => {
  boxAt(body.position, PLAYER.halfWidth, PLAYER.height, probe);
  out.length = 0;
  solids.forEach((solid) => {
    if (aabbOverlap(probe, solid)) out.push(solid);
  });
  return out;
};

const hits: Aabb[] = [];

const highestTop = (boxes: Aabb[]) => (
  boxes.reduce((top, box) => Math.max(top, box.max[1]), -Infinity)
);

const lowestBottom = (boxes: Aabb[]) => (
  boxes.reduce((bottom, box) => Math.min(bottom, box.min[1]), Infinity)
);

/** Moves along x (axis 0) or z (axis 2), climbing low ledges when standing. */
const moveHorizontal = (body: PlayerBody, axis: 0 | 2, delta: number, world: CollisionWorld) => {
  if (delta === 0) return;
  const { position, velocity } = body;
  position[axis] += delta;
  if (!collisions(body, world.solids, hits).length) return;
  const top = highestTop(hits);
  const climb = top - position[1];
  if (body.grounded && climb > 0 && climb <= PLAYER.stepHeight) {
    const previousY = position[1];
    position[1] = top;
    if (!collisions(body, world.solids, hits).length) return;
    position[1] = previousY;
  }
  position[axis] -= delta;
  velocity[axis] = 0;
};

/** Finds ground within `depth` under the feet and stands on it. */
const settleOnGround = (body: PlayerBody, depth: number, world: CollisionWorld): boolean => {
  const { position } = body;
  boxAt(position, PLAYER.halfWidth, depth, probe, -depth);
  let top = -Infinity;
  world.solids.forEach((solid) => {
    if (aabbOverlap(probe, solid) && solid.max[1] <= position[1] + GROUND_EPSILON) {
      top = Math.max(top, solid.max[1]);
    }
  });
  if (top === -Infinity) return false;
  position[1] = top;
  return true;
};

const moveVertical = (
  body: PlayerBody,
  dt: number,
  world: CollisionWorld,
  snapDown: boolean,
): boolean => {
  const { position, velocity } = body;
  const wasGrounded = body.grounded;
  position[1] += velocity[1] * dt;
  if (collisions(body, world.solids, hits).length) {
    if (velocity[1] <= 0) {
      position[1] = highestTop(hits);
      body.grounded = true;
    } else {
      position[1] = lowestBottom(hits) - PLAYER.height;
    }
    velocity[1] = 0;
    return !wasGrounded && body.grounded;
  }
  if (velocity[1] > 0) {
    body.grounded = false;
    return false;
  }
  // Walking down stairs keeps the feet on the steps instead of floating off each one.
  body.grounded = settleOnGround(body, snapDown ? PLAYER.stepHeight : GROUND_EPSILON, world);
  if (body.grounded) velocity[1] = 0;
  return !wasGrounded && body.grounded;
};

const approach = (current: number, target: number, rate: number) => (
  current + (target - current) * rate
);

const applyIntent = (body: PlayerBody, intent: MoveIntent, dt: number) => {
  const { velocity } = body;
  const length = Math.hypot(intent.forward, intent.strafe);
  const scale = length > 1 ? 1 / length : 1;
  const forward = intent.forward * scale;
  const strafe = intent.strafe * scale;
  const sin = Math.sin(intent.yaw);
  const cos = Math.cos(intent.yaw);
  const speed = intent.walk ? PLAYER.walkSpeed : PLAYER.runSpeed;
  const targetX = (-sin * forward + cos * strafe) * speed;
  const targetZ = (-cos * forward - sin * strafe) * speed;
  if (body.grounded) {
    const rate = Math.min(1, PLAYER.groundAccel * dt);
    velocity[0] = approach(velocity[0], targetX, rate);
    velocity[2] = approach(velocity[2], targetZ, rate);
  } else if (length > 0) {
    // In the air, only steering: letting go keeps the momentum (jump pads rely on it).
    const rate = Math.min(1, PLAYER.airAccel * dt);
    velocity[0] = approach(velocity[0], targetX, rate);
    velocity[2] = approach(velocity[2], targetZ, rate);
  }
};

const standingOnPad = (body: PlayerBody, world: CollisionWorld) => world.pads.find((pad) => (
  body.position[0] >= pad.min[0] && body.position[0] <= pad.max[0]
  && body.position[2] >= pad.min[2] && body.position[2] <= pad.max[2]
  && Math.abs(body.position[1] - pad.max[1]) <= GROUND_EPSILON
));

const hazardDamage = (body: PlayerBody, world: CollisionWorld, dt: number) => {
  const [x, y, z] = body.position;
  return world.hazards.reduce((damage, hazard) => (
    x >= hazard.min[0] && x <= hazard.max[0]
    && y >= hazard.min[1] && y <= hazard.max[1]
    && z >= hazard.min[2] && z <= hazard.max[2]
      ? damage + hazard.damagePerSecond * dt
      : damage
  ), 0);
};

/** Advances the player by `dt` seconds: input, gravity, collisions, pads and hazards. */
export const stepPlayer = (
  body: PlayerBody,
  intent: MoveIntent,
  dt: number,
  world: CollisionWorld,
): StepEvents => {
  const events: StepEvents = {
    jumped: false, launched: false, landed: false, hazardDamage: 0,
  };
  let remaining = dt;
  while (remaining > 0) {
    const h = Math.min(PLAYER.maxSubstep, remaining);
    remaining -= h;
    const { velocity } = body;

    applyIntent(body, intent, h);
    if (body.grounded && intent.jump) {
      velocity[1] = PLAYER.jumpSpeed;
      body.grounded = false;
      events.jumped = true;
    }
    velocity[1] = Math.max(-PLAYER.maxFallSpeed, velocity[1] - PLAYER.gravity * h);

    moveHorizontal(body, 0, velocity[0] * h, world);
    moveHorizontal(body, 2, velocity[2] * h, world);
    const snapDown = body.grounded && !events.jumped && !events.launched;
    if (moveVertical(body, h, world, snapDown)) events.landed = true;

    const pad = body.grounded ? standingOnPad(body, world) : undefined;
    if (pad) {
      velocity[0] = pad.launch[0];
      velocity[1] = pad.launch[1];
      velocity[2] = pad.launch[2];
      body.grounded = false;
      events.launched = true;
    }
    events.hazardDamage += hazardDamage(body, world, h);
  }
  return events;
};
