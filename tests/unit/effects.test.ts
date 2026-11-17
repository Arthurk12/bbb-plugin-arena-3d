import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createEffects, surfaceNormalAt } from '../../src/game/effects/effects';
import { DECALS, PARTICLES, TRACERS } from '../../src/game/effects/constants';
import { block } from '../../src/game/level/service';

const WALL = block([0, 0, 0], [2, 3, 1], 'wall');

const instanced = (scene: THREE.Scene) => scene.children
  .filter((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh);

// Tracers are boxes, bullet marks are planes (both pools have the same size).
const tracerMesh = (scene: THREE.Scene) => instanced(scene)
  .find((mesh) => mesh.geometry instanceof THREE.BoxGeometry)!;

const decalMesh = (scene: THREE.Scene) => instanced(scene)
  .find((mesh) => mesh.geometry instanceof THREE.PlaneGeometry)!;

const particleColors = (scene: THREE.Scene) => {
  const points = scene.children.find((child): child is THREE.Points => child instanceof THREE.Points)!;
  return points.geometry.getAttribute('color').array as Float32Array;
};

const scaleAt = (mesh: THREE.InstancedMesh, index: number) => {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return Math.abs(matrix.determinant());
};

describe('surfaceNormalAt', () => {
  it('finds the face an impact lies on', () => {
    const normal = new THREE.Vector3();
    expect(surfaceNormalAt([2, 1, 0.5], [WALL], normal)).toBe(true);
    expect(normal.toArray()).toEqual([1, 0, 0]);
    expect(surfaceNormalAt([1, 3, 0.5], [WALL], normal)).toBe(true);
    expect(normal.toArray()).toEqual([0, 1, 0]);
    expect(surfaceNormalAt([1, 1, -0.0001], [WALL], normal)).toBe(true);
    expect(normal.toArray()).toEqual([0, 0, -1]);
  });

  it('says false for a point in the air', () => {
    expect(surfaceNormalAt([5, 5, 5], [WALL], new THREE.Vector3())).toBe(false);
  });
});

describe('createEffects', () => {
  it('draws everything with three objects', () => {
    const scene = new THREE.Scene();
    createEffects(scene, [WALL]);
    expect(scene.children).toHaveLength(3);
  });

  it('shows a tracer and hides it after its lifetime', () => {
    const scene = new THREE.Scene();
    const effects = createEffects(scene, [WALL]);
    effects.tracer([0, 1, 5], [0, 1, 1], 0xffffff, 1000);
    effects.update(1000);
    expect(scaleAt(tracerMesh(scene), 0)).toBeGreaterThan(0);
    effects.update(1000 + TRACERS.lifetimeMs + 1);
    expect(scaleAt(tracerMesh(scene), 0)).toBe(0);
  });

  it('leaves particles and a mark where a shot meets a wall', () => {
    const scene = new THREE.Scene();
    const effects = createEffects(scene, [WALL]);
    effects.update(1000);
    effects.spark([1, 1, 1], false, 1000);
    effects.update(1016);
    expect(Math.max(...particleColors(scene))).toBeGreaterThan(0);
    expect(scaleAt(decalMesh(scene), 0)).toBeGreaterThan(0);
    effects.update(1016 + PARTICLES.lifetimeMs);
    expect(Math.max(...particleColors(scene))).toBe(0);
    effects.update(1000 + DECALS.lifetimeMs + 1);
    expect(scaleAt(decalMesh(scene), 0)).toBe(0);
  });

  it('leaves particles but no mark on a player, and nothing in the air', () => {
    const scene = new THREE.Scene();
    const effects = createEffects(scene, [WALL]);
    effects.update(1000);
    effects.spark([9, 9, 9], false, 1000);
    effects.update(1016);
    expect(Math.max(...particleColors(scene))).toBe(0);
    effects.spark([9, 9, 9], true, 1020);
    effects.update(1030);
    expect(Math.max(...particleColors(scene))).toBeGreaterThan(0);
    expect(scaleAt(decalMesh(scene), 0)).toBe(0);
  });

  it('reuses its pools instead of growing', () => {
    const scene = new THREE.Scene();
    const effects = createEffects(scene, [WALL]);
    for (let i = 0; i < TRACERS.capacity * 2; i += 1) effects.tracer([0, 1, 5], [0, 1, 1], 0xffffff, i);
    for (let i = 0; i < DECALS.capacity * 2; i += 1) effects.spark([1, 1, 1], false, i);
    expect(scene.children).toHaveLength(3);
    expect(tracerMesh(scene).count).toBe(TRACERS.capacity);
  });

  it('removes everything from the scene on dispose', () => {
    const scene = new THREE.Scene();
    createEffects(scene, [WALL]).dispose();
    expect(scene.children).toHaveLength(0);
  });
});
