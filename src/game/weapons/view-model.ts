import * as THREE from 'three';
import { ViewModel, WeaponId } from './types';
import { VIEW_MODEL } from './constants';

type Triple = [number, number, number];

const box = (size: Triple, material: THREE.Material, at: Triple) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(at[0], at[1], at[2]);
  return mesh;
};

/** The gun in your hands, drawn on top of the camera. */
export const createViewModel = (camera: THREE.Camera): ViewModel => {
  const materials = {
    metal: new THREE.MeshLambertMaterial({ color: VIEW_MODEL.colors.metal }),
    dark: new THREE.MeshLambertMaterial({ color: VIEW_MODEL.colors.dark }),
    wood: new THREE.MeshLambertMaterial({ color: VIEW_MODEL.colors.wood }),
    glow: new THREE.MeshBasicMaterial({ color: VIEW_MODEL.colors.glow }),
    flash: new THREE.MeshBasicMaterial({ color: VIEW_MODEL.colors.flash }),
  };
  const root = new THREE.Group();
  root.position.set(...VIEW_MODEL.rest);
  root.scale.setScalar(VIEW_MODEL.scale);
  camera.add(root);

  const blaster = new THREE.Group();
  blaster.add(
    box([0.09, 0.11, 0.38], materials.metal, [0, 0, 0]),
    box([0.05, 0.05, 0.2], materials.dark, [0, 0.02, -0.27]),
    box([0.07, 0.16, 0.08], materials.dark, [0, -0.12, 0.1]),
    box([0.1, 0.02, 0.2], materials.glow, [0, 0.065, -0.02]),
  );
  const shotgun = new THREE.Group();
  shotgun.add(
    box([0.06, 0.06, 0.6], materials.dark, [-0.035, 0.02, -0.2]),
    box([0.06, 0.06, 0.6], materials.dark, [0.035, 0.02, -0.2]),
    box([0.13, 0.1, 0.25], materials.metal, [0, -0.02, 0.1]),
    box([0.11, 0.14, 0.3], materials.wood, [0, -0.08, 0.3]),
  );
  const flash = box([0.14, 0.14, 0.14], materials.flash, [0, 0.02, -0.55]);
  flash.visible = false;
  root.add(blaster, shotgun, flash);

  let bobPhase = 0;
  let kick = 0;
  let flashUntil = -Infinity;

  const setWeapon = (weapon: WeaponId) => {
    blaster.visible = weapon === 'blaster';
    shotgun.visible = weapon === 'shotgun';
  };
  setWeapon('blaster');

  return {
    setWeapon,
    update: (dt, speed, now, visible) => {
      root.visible = visible;
      bobPhase += speed * dt * VIEW_MODEL.bobFrequency;
      kick = Math.max(0, kick - dt * VIEW_MODEL.kickRecovery);
      const bob = Math.min(1, speed / VIEW_MODEL.bobFullSpeed) * VIEW_MODEL.bobAmplitude;
      root.position.set(
        VIEW_MODEL.rest[0] + Math.cos(bobPhase) * bob,
        VIEW_MODEL.rest[1] + Math.abs(Math.sin(bobPhase)) * bob,
        VIEW_MODEL.rest[2] + kick * VIEW_MODEL.kickDistance,
      );
      root.rotation.x = kick * VIEW_MODEL.kickAngle;
      flash.visible = now < flashUntil;
    },
    fire: (now) => {
      kick = 1;
      flashUntil = now + VIEW_MODEL.flashMs;
    },
    dispose: () => {
      camera.remove(root);
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
};
