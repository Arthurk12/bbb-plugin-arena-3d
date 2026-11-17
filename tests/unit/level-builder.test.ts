import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildLevel, occlusionAt } from '../../src/game/level/builder';
import { AMBIENT_OCCLUSION } from '../../src/game/level/constants';
import { ARENA_LEVEL } from '../../src/game/level/layout';
import { createLevelTextures } from '../../src/game/level/textures';

const meshes = (group: THREE.Group) => group.children
  .filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);

describe('occlusionAt', () => {
  it('darkens the foot of side faces and fades out with height', () => {
    expect(occlusionAt(1, 0)).toBe(1);
    expect(occlusionAt(-1, 0)).toBe(AMBIENT_OCCLUSION.bottom);
    expect(occlusionAt(0, 0)).toBeCloseTo(AMBIENT_OCCLUSION.base);
    expect(occlusionAt(0, AMBIENT_OCCLUSION.height)).toBe(1);
    expect(occlusionAt(0, AMBIENT_OCCLUSION.height * 3)).toBe(1);
    const low = occlusionAt(0, AMBIENT_OCCLUSION.height * 0.25);
    const high = occlusionAt(0, AMBIENT_OCCLUSION.height * 0.75);
    expect(low).toBeLessThan(high);
  });
});

describe('buildLevel', () => {
  it('bakes darker and lighter vertices into the shaded level meshes', () => {
    const built = buildLevel(ARENA_LEVEL);
    const shaded = meshes(built.group).find((mesh) => mesh.material instanceof THREE.MeshLambertMaterial
      && mesh.geometry.getAttribute('color'))!;
    const colors = shaded.geometry.getAttribute('color').array as Float32Array;
    expect(Math.min(...colors)).toBeLessThan(0.7);
    expect(Math.max(...colors)).toBe(1);
  });

  it('adds a sky dome that follows the viewer', () => {
    const built = buildLevel(ARENA_LEVEL);
    const sky = meshes(built.group).find((mesh) => mesh.material instanceof THREE.ShaderMaterial)!;
    expect(sky).toBeDefined();
    built.animate(1000, new THREE.Vector3(3, 4, 5));
    expect(sky.position.toArray()).toEqual([3, 4, 5]);
  });

  it('pulses the neon, scrolls the pads and bobs the pickups over time', () => {
    const built = buildLevel(ARENA_LEVEL);
    const neon = meshes(built.group)
      .map((mesh) => mesh.material as THREE.MeshBasicMaterial)
      .find((material) => material instanceof THREE.MeshBasicMaterial && !material.transparent
        && material.color.getHex() !== 0)!;
    const kits = built.group.children
      .find((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh)!;
    const kitY = () => {
      const matrix = new THREE.Matrix4();
      kits.getMatrixAt(0, matrix);
      return new THREE.Vector3().setFromMatrixPosition(matrix).y;
    };
    const viewer = new THREE.Vector3();
    built.animate(0, viewer);
    const neonBefore = neon.color.getHex();
    const kitBefore = kitY();
    built.animate(400, viewer);
    expect(neon.color.getHex()).not.toBe(neonBefore);
    expect(kitY()).not.toBe(kitBefore);
  });

  it('draws the health kits and the ammo boxes in one instanced mesh each', () => {
    const built = buildLevel(ARENA_LEVEL);
    const pickupMeshes = built.group.children
      .filter((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh);
    const count = (kind: string) => ARENA_LEVEL.pickups.filter((p) => p.kind === kind).length;
    expect(pickupMeshes.map((mesh) => mesh.count)).toEqual([count('health'), count('ammo')]);
  });

  it('hides a taken kit and its glow until it is available again', () => {
    const built = buildLevel(ARENA_LEVEL);
    const glow = built.group.children.find((child): child is THREE.Points => child instanceof THREE.Points)!;
    const kits = built.group.children
      .find((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh)!;
    const colors = glow.geometry.getAttribute('color');
    const kitScale = () => {
      const matrix = new THREE.Matrix4();
      kits.getMatrixAt(0, matrix);
      return matrix.determinant();
    };
    built.setPickupAvailable(0, false);
    built.animate(100, new THREE.Vector3());
    expect([colors.getX(0), colors.getY(0), colors.getZ(0)]).toEqual([0, 0, 0]);
    expect(kitScale()).toBe(0);
    built.setPickupAvailable(0, true);
    built.animate(200, new THREE.Vector3());
    expect(colors.getY(0)).toBeGreaterThan(0);
    expect(kitScale()).not.toBe(0);
  });
});

describe('createLevelTextures', () => {
  it('paints each texture once and reuses the canvas when the arena opens again', () => {
    const first = createLevelTextures();
    const second = createLevelTextures();
    expect(second.wall!.image).toBe(first.wall!.image);
    expect(second.wall).not.toBe(first.wall);
    expect(first.slime).toBeDefined();
  });
});
