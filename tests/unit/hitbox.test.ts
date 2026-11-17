import { describe, expect, it } from 'vitest';
import { Vec3 } from '../../src/commons/types';
import {
  createHitbox, rayHitbox, worseZone, writeHitbox, zoneAt, zoneIndex,
} from '../../src/game/hitbox/service';

const FORWARD: Vec3 = [0, 0, -1];

/** A player 10 m down -z, turned by `yaw` and aiming at `pitch`. */
const playerAt = (yaw = 0, pitch = 0) => writeHitbox({ p: [0, 0, -10], y: yaw, x: pitch }, createHitbox());

/** A ray down -z from the origin side of the player, `x` to the side and `height` up. */
const shoot = (x: number, height: number, yaw = 0, pitch = 0) => (
  rayHitbox([x, height, 0], FORWARD, playerAt(yaw, pitch), 100)
);

describe('rayHitbox', () => {
  it('tells head, torso and legs apart by height', () => {
    expect(shoot(0, 1.6)?.zone).toBe('head');
    expect(shoot(0, 1.1)?.zone).toBe('torso');
    expect(shoot(0, 0.4)?.zone).toBe('legs');
    expect(shoot(0, 2.1)).toBeNull();
  });

  it('measures the distance to where the ray enters the body', () => {
    // Facing -z, the player's back (with the backpack) is towards the shooter.
    expect(shoot(0, 1.1)?.distance).toBeCloseTo(10 - 0.32);
  });

  it('hits the arms held forward, beside the torso', () => {
    // Held forward, an arm runs from the shoulder (z = 0 in the body) to the hand (z = -0.74).
    const hit = shoot(0.4, 1.4);
    expect(hit?.zone).toBe('arms');
    expect(hit?.distance).toBeCloseTo(10);
  });

  it('turns the zones with the yaw', () => {
    // Facing -x, the arms point down -x and sit 0.3 to 0.5 m to each side along z.
    expect(shoot(-0.6, 1.4)).toBeNull();
    const hit = shoot(-0.5, 1.4, Math.PI / 2);
    expect(hit?.zone).toBe('arms');
    expect(hit?.distance).toBeCloseTo(9.5);
  });

  it('turns the arms with the pitch', () => {
    expect(shoot(0.4, 1.0)).toBeNull();
    expect(shoot(0.4, 1.0, 0, -0.8)?.zone).toBe('arms');
  });

  it('respects the maximum distance', () => {
    expect(rayHitbox([0, 1.1, 0], FORWARD, playerAt(), 5)).toBeNull();
  });
});

describe('zones', () => {
  it('maps zones to protocol indexes and back', () => {
    expect(zoneIndex('head')).toBe(0);
    expect(zoneAt(zoneIndex('legs'))).toBe('legs');
    expect(zoneAt(-1)).toBeNull();
    expect(zoneAt(9)).toBeNull();
  });

  it('keeps the more damaging zone', () => {
    expect(worseZone('legs', 'head')).toBe('head');
    expect(worseZone('torso', 'arms')).toBe('torso');
  });
});
