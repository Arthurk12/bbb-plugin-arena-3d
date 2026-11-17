import * as THREE from 'three';
import { modelGeometry } from '../models/service';
import { DEFAULT_WEAPON, VIEW_MODEL, WEAPON_IDS } from './constants';
import { FLASH_PARTS, VIEW_MODELS } from './models';
import { ViewModel, WeaponId } from './types';

/** Halfway through a switch the old gun is out of sight and the new one starts coming up. */
const SWITCH_MIDPOINT = 0.5;

/**
 * The gun in your hands, drawn on top of the camera: each gun is two meshes (its lit parts and
 * its glowing ones), and only the one in hand is visible.
 */
export const createViewModel = (camera: THREE.Camera): ViewModel => {
  const bodyMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const root = new THREE.Group();
  root.position.set(...VIEW_MODEL.rest);
  root.scale.setScalar(VIEW_MODEL.scale);
  camera.add(root);

  const guns = new Map<WeaponId, THREE.Group>();
  WEAPON_IDS.forEach((id) => {
    const group = new THREE.Group();
    const { parts } = VIEW_MODELS[id];
    const lit = parts.filter((part) => !part.glow);
    const glowing = parts.filter((part) => part.glow);
    if (lit.length) group.add(new THREE.Mesh(modelGeometry(lit), bodyMaterial));
    if (glowing.length) group.add(new THREE.Mesh(modelGeometry(glowing), glowMaterial));
    group.visible = false;
    root.add(group);
    guns.set(id, group);
  });
  const flash = new THREE.Mesh(modelGeometry(FLASH_PARTS), glowMaterial);
  flash.visible = false;
  root.add(flash);

  let shown: WeaponId = DEFAULT_WEAPON;
  let target: WeaponId = DEFAULT_WEAPON;
  let switchStartedAt = -Infinity;
  let bobPhase = 0;
  let kick = 0;
  let flashUntil = -Infinity;
  let reloadStartedAt = -Infinity;
  let reloadMs = 0;

  const show = (weapon: WeaponId) => {
    shown = weapon;
    guns.forEach((group, id) => {
      // eslint-disable-next-line no-param-reassign
      group.visible = id === weapon;
    });
    const { muzzle, flashSize } = VIEW_MODELS[weapon];
    flash.position.set(...muzzle);
    flash.scale.setScalar(flashSize);
  };
  show(DEFAULT_WEAPON);

  /** 0 at rest, 1 fully lowered: down with the old gun, back up with the new one. */
  const switchDrop = (now: number): number => {
    const progress = (now - switchStartedAt) / VIEW_MODEL.switchMs;
    if (progress >= SWITCH_MIDPOINT && shown !== target) show(target);
    if (progress >= 1) return 0;
    return progress < SWITCH_MIDPOINT
      ? progress / SWITCH_MIDPOINT
      : (1 - progress) / (1 - SWITCH_MIDPOINT);
  };

  /** 0 at rest, rising to 1 halfway through a reload and back. */
  const reloadDip = (now: number): number => {
    const progress = (now - reloadStartedAt) / reloadMs;
    if (!reloadMs || progress < 0 || progress >= 1) return 0;
    return Math.sin(progress * Math.PI);
  };

  return {
    setWeapon: (weapon, now) => {
      if (weapon === target) return;
      target = weapon;
      switchStartedAt = now;
      reloadStartedAt = -Infinity;
    },
    update: (dt, speed, now, visible) => {
      root.visible = visible;
      bobPhase += speed * dt * VIEW_MODEL.bobFrequency;
      kick = Math.max(0, kick - dt * VIEW_MODEL.kickRecovery);
      const moving = Math.min(1, speed / VIEW_MODEL.bobFullSpeed);
      const bob = moving * VIEW_MODEL.bobAmplitude;
      const sway = (1 - moving) * VIEW_MODEL.swayAmplitude;
      const swayPhase = (now / 1000) * VIEW_MODEL.swayFrequency;
      const drop = switchDrop(now);
      const dip = reloadDip(now);
      const recoil = VIEW_MODELS[shown].kick;
      const [restX, restY, restZ] = VIEW_MODEL.rest;
      root.position.set(
        restX + Math.cos(bobPhase) * bob + Math.sin(swayPhase) * sway,
        restY + Math.abs(Math.sin(bobPhase)) * bob
          // Twice as fast up and down as sideways: a figure eight.
          + Math.sin(swayPhase * 2) * sway * VIEW_MODEL.swayHeight
          - drop * VIEW_MODEL.switchDrop
          - dip * VIEW_MODEL.reloadDrop,
        restZ + kick * recoil.distance,
      );
      root.rotation.x = kick * recoil.angle - drop * VIEW_MODEL.switchTilt
        - dip * VIEW_MODEL.reloadTilt;
      root.rotation.z = dip * VIEW_MODEL.reloadRoll;
      flash.visible = now < flashUntil;
    },
    fire: (now) => {
      kick = 1;
      flashUntil = now + VIEW_MODEL.flashMs;
      // A different burst each shot.
      flash.rotation.z = Math.random() * Math.PI;
    },
    reload: (now, durationMs) => {
      reloadStartedAt = now;
      reloadMs = durationMs;
    },
    dispose: () => {
      camera.remove(root);
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      bodyMaterial.dispose();
      glowMaterial.dispose();
    },
  };
};
