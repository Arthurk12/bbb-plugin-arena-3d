import { describe, expect, it } from 'vitest';
import { stepPlayer } from '../../src/game/player/service';
import { PLAYER } from '../../src/game/player/constants';
import { CollisionWorld, MoveIntent, PlayerBody } from '../../src/game/player/types';
import { block, stairs } from '../../src/game/level/service';

const FRAME = 1 / 60;

const floor = block([-50, -1, -50], [50, 0, 50], 'floor');

const world = (extra: CollisionWorld['solids'] = [], rest: Partial<CollisionWorld> = {}): CollisionWorld => ({
  solids: [floor, ...extra], pads: [], hazards: [], ...rest,
});

const standing = (x = 0, z = 0, y = 0): PlayerBody => ({
  position: [x, y, z], velocity: [0, 0, 0], grounded: true,
});

const idle: MoveIntent = {
  forward: 0, strafe: 0, jump: false, walk: false, yaw: 0,
};

const run = (body: PlayerBody, intent: MoveIntent, seconds: number, w: CollisionWorld) => {
  const events = [];
  for (let t = 0; t < seconds; t += FRAME) events.push(stepPlayer(body, intent, FRAME, w));
  return events;
};

describe('stepPlayer', () => {
  it('stands still on the floor', () => {
    const body = standing();
    run(body, idle, 1, world());
    expect(body.position[1]).toBe(0);
    expect(body.grounded).toBe(true);
  });

  it('falls onto the floor and lands', () => {
    const body: PlayerBody = { position: [0, 5, 0], velocity: [0, 0, 0], grounded: false };
    const events = run(body, idle, 2, world());
    expect(body.position[1]).toBe(0);
    expect(events.some((event) => event.landed)).toBe(true);
  });

  it('runs forward (-z at yaw 0) at run speed', () => {
    const body = standing();
    run(body, { ...idle, forward: 1 }, 1, world());
    expect(body.position[2]).toBeLessThan(-PLAYER.runSpeed * 0.7);
    expect(Math.abs(body.position[0])).toBeLessThan(1e-6);
  });

  it('strafes right (+x at yaw 0)', () => {
    const body = standing();
    run(body, { ...idle, strafe: 1 }, 0.5, world());
    expect(body.position[0]).toBeGreaterThan(1);
  });

  it('is stopped by walls', () => {
    const body = standing();
    run(body, { ...idle, forward: 1 }, 2, world([block([-5, 0, -3], [5, 4, -2], 'wall')]));
    expect(body.position[2]).toBeGreaterThanOrEqual(-2 + PLAYER.halfWidth - 1e-6);
  });

  it('climbs stairs without jumping', () => {
    const steps = stairs({
      foot: -2,
      across: 0,
      direction: '-z',
      width: 3,
      steps: 6,
      rise: 0.5,
      run: 0.8,
      baseY: 0,
      material: 'metal',
    });
    const landing = block([-1.5, 0, -30], [1.5, 3, -6.8], 'concrete');
    const body = standing();
    run(body, { ...idle, forward: 1 }, 1.5, world([...steps, landing]));
    expect(body.position[1]).toBe(3);
  });

  it('cannot walk up a ledge taller than a step', () => {
    const body = standing();
    run(body, { ...idle, forward: 1 }, 1, world([block([-5, 0, -3], [5, 1, -2], 'crate')]));
    expect(body.position[1]).toBe(0);
  });

  it('jumps about a meter and a half', () => {
    const body = standing();
    let peak = 0;
    for (let t = 0; t < 1; t += FRAME) {
      stepPlayer(body, { ...idle, jump: t === 0 }, FRAME, world());
      peak = Math.max(peak, body.position[1]);
    }
    expect(peak).toBeGreaterThan(1.2);
    expect(peak).toBeLessThan(1.7);
  });

  it('is launched by a jump pad', () => {
    const pad = { min: [-1, 0, -1], max: [1, 0.25, 1], launch: [0, 15, 0] } as CollisionWorld['pads'][number];
    const padBlock = block(pad.min, pad.max, 'pad');
    const body = standing(0, 0, 0.25);
    const events = run(body, idle, 0.3, world([padBlock], { pads: [pad] }));
    expect(events.some((event) => event.launched)).toBe(true);
    expect(body.position[1]).toBeGreaterThan(2);
  });

  it('reports damage while standing in a hazard', () => {
    const hazard = {
      min: [-1, -1, -1], max: [1, 1, 1], damagePerSecond: 30,
    } as CollisionWorld['hazards'][number];
    const body = standing();
    const events = run(body, idle, 1, world([], { hazards: [hazard] }));
    const total = events.reduce((sum, event) => sum + event.hazardDamage, 0);
    expect(total).toBeCloseTo(30, 0);
  });
});
