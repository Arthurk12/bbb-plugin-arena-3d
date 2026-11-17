import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createAvatarCrowd } from '../../src/game/remote/crowd';
import { AVATAR, NAME_TAG, REMOTE_FLASH_MS } from '../../src/game/remote/constants';
import { AvatarFrame } from '../../src/game/remote/types';
import { WEAPON_IDS } from '../../src/game/weapons/constants';

const frame = (p: [number, number, number], extra: Partial<AvatarFrame> = {}): AvatarFrame => ({
  pose: { p, y: 0, x: 0 },
  speed: 0,
  alive: true,
  weapon: 0,
  dt: 0.016,
  now: 1000,
  viewerDistance: 5,
  ...extra,
});

const instancedMeshes = (scene: THREE.Scene) => scene.children
  .filter((child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh);

const sprites = (scene: THREE.Scene) => scene.children
  .filter((child): child is THREE.Sprite => child instanceof THREE.Sprite);

const translationAt = (mesh: THREE.InstancedMesh, index: number) => {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
};

describe('createAvatarCrowd', () => {
  it('draws every player with six instanced meshes, legs twice per player', () => {
    const scene = new THREE.Scene();
    const crowd = createAvatarCrowd(scene);
    crowd.add('a');
    crowd.add('b');
    crowd.add('c');
    const meshes = instancedMeshes(scene);
    expect(meshes).toHaveLength(6);
    expect(crowd.size()).toBe(3);
    expect(meshes.map((mesh) => mesh.count).sort()).toEqual([3, 3, 3, 3, 3, 6]);
  });

  it('keeps instances dense: the last player takes a freed slot', () => {
    const scene = new THREE.Scene();
    const crowd = createAvatarCrowd(scene);
    const a = crowd.add('a');
    const b = crowd.add('b');
    const c = crowd.add('c');
    a.update(frame([1, 0, 0]));
    b.update(frame([2, 0, 0]));
    c.update(frame([3, 0, 0]));
    b.dispose();
    expect(crowd.size()).toBe(2);
    // The torso mesh has the same matrix as the body: its translation is the feet.
    const torso = instancedMeshes(scene).find((mesh) => mesh.count === 2 && mesh.material instanceof THREE.MeshLambertMaterial)!;
    expect(translationAt(torso, 0).x).toBeCloseTo(1);
    expect(translationAt(torso, 1).x).toBeCloseTo(3);
    b.dispose(); // twice is harmless
    expect(crowd.size()).toBe(2);
  });

  it('puts the muzzle in front of the right shoulder when aiming level', () => {
    const scene = new THREE.Scene();
    const crowd = createAvatarCrowd(scene);
    const avatar = crowd.add('a');
    avatar.update(frame([5, 0, 5]));
    const [x, y, z] = avatar.muzzlePosition();
    expect(x).toBeCloseTo(5 + AVATAR.armOffsetX, 1);
    expect(z).toBeLessThan(5 - 0.5);
    expect(Math.abs(y - AVATAR.shoulderHeight)).toBeLessThan(0.2);
  });

  it('shows each player the gun they hold, with its muzzle at the barrel', () => {
    const scene = new THREE.Scene();
    const crowd = createAvatarCrowd(scene);
    const avatar = crowd.add('a');
    const arms = instancedMeshes(scene).find((mesh) => mesh.geometry.getAttribute('heldWeapon'))!;
    const held = arms.geometry.getAttribute('heldWeapon');
    avatar.update(frame([0, 0, 0]));
    expect(held.getX(0)).toBe(1);
    const blasterZ = avatar.muzzlePosition()[2];
    const shotgun = WEAPON_IDS.indexOf('shotgun');
    avatar.update(frame([0, 0, 0], { weapon: shotgun }));
    expect(held.getX(0)).toBe(shotgun + 1);
    // Facing -z: the longer gun reaches further forward.
    expect(avatar.muzzlePosition()[2]).toBeLessThan(blasterZ - 0.1);
  });

  it('shows the muzzle flash only briefly after a shot', () => {
    const scene = new THREE.Scene();
    const crowd = createAvatarCrowd(scene);
    const avatar = crowd.add('a');
    const flashes = instancedMeshes(scene).find((mesh) => mesh.material instanceof THREE.MeshBasicMaterial
      && mesh.material.blending === THREE.AdditiveBlending)!;
    const flashScale = () => {
      const matrix = new THREE.Matrix4();
      flashes.getMatrixAt(0, matrix);
      return matrix.determinant();
    };
    avatar.update(frame([0, 0, 0], { now: 1000 }));
    expect(flashScale()).toBe(0);
    avatar.flash(1000);
    avatar.update(frame([0, 0, 0], { now: 1010 }));
    expect(flashScale()).not.toBe(0);
    avatar.update(frame([0, 0, 0], { now: 1000 + REMOTE_FLASH_MS + 1 }));
    expect(flashScale()).toBe(0);
  });

  it('hides name tags of dead and far players', () => {
    const scene = new THREE.Scene();
    const crowd = createAvatarCrowd(scene);
    const avatar = crowd.add('a');
    const [tag] = sprites(scene);
    avatar.update(frame([0, 0, 0]));
    expect(tag.visible).toBe(true);
    avatar.update(frame([0, 0, 0], { viewerDistance: NAME_TAG.maxDistance + 1 }));
    expect(tag.visible).toBe(false);
    avatar.update(frame([0, 0, 0], { alive: false }));
    expect(tag.visible).toBe(false);
  });

  it('ignores players beyond its capacity', () => {
    const scene = new THREE.Scene();
    const crowd = createAvatarCrowd(scene, 2);
    crowd.add('a');
    crowd.add('b');
    const extra = crowd.add('c');
    expect(crowd.size()).toBe(2);
    expect(() => extra.update(frame([0, 0, 0]))).not.toThrow();
  });

  it('removes everything from the scene on dispose', () => {
    const scene = new THREE.Scene();
    const crowd = createAvatarCrowd(scene);
    crowd.add('a');
    crowd.add('b');
    crowd.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
