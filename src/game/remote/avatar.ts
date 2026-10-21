import * as THREE from 'three';
import {
  AVATAR, AVATAR_COLORS, LEG_SWING, NAME_TAG, REMOTE_FLASH_MS, USER_COLOR_SL,
} from './constants';
import { truncateName, userHue } from './service';
import { RemoteAvatar } from './types';

const DEATH_TILT = Math.PI / 2;
const NAME_TAG_BACKGROUND = 'rgba(0, 0, 0, 0.55)';
const NAME_TAG_TEXT = '#ffffff';
const NAME_TAG_BORDER = 4;
const FLASH_SIZE = 0.35;
/** Shoulder rotation that points a hanging arm straight ahead. */
const ARM_AIM = Math.PI / 2;
const HAIR_OVERHANG = 0.02;

const box = (size: [number, number, number], material: THREE.Material) => (
  new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material)
);

const drawNameTag = (canvas: HTMLCanvasElement, name: string, color: string) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = NAME_TAG_BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = color;
  ctx.lineWidth = NAME_TAG_BORDER;
  const inset = NAME_TAG_BORDER / 2;
  ctx.strokeRect(inset, inset, width - NAME_TAG_BORDER, height - NAME_TAG_BORDER);
  ctx.font = NAME_TAG.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = NAME_TAG_TEXT;
  ctx.fillText(truncateName(name, NAME_TAG.maxChars), width / 2, height / 2);
};

/** A blocky soldier: legs swing while moving, head and arms follow the aim, falls when dead. */
export const createRemoteAvatar = (userId: string): RemoteAvatar => {
  const torsoColor = new THREE.Color().setHSL(userHue(userId), USER_COLOR_SL[0], USER_COLOR_SL[1]);
  const materials = {
    torso: new THREE.MeshLambertMaterial({ color: torsoColor }),
    legs: new THREE.MeshLambertMaterial({ color: AVATAR_COLORS.legs }),
    skin: new THREE.MeshLambertMaterial({ color: AVATAR_COLORS.skin }),
    hair: new THREE.MeshLambertMaterial({ color: AVATAR_COLORS.hair }),
    visor: new THREE.MeshBasicMaterial({ color: AVATAR_COLORS.visor }),
    gun: new THREE.MeshLambertMaterial({ color: AVATAR_COLORS.gun }),
    flash: new THREE.MeshBasicMaterial({ color: AVATAR_COLORS.flash }),
  };

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * AVATAR.legOffsetX, AVATAR.hipHeight, 0);
    const leg = box(AVATAR.leg, materials.legs);
    leg.position.y = -AVATAR.leg[1] / 2;
    hip.add(leg);
    body.add(hip);
    return hip;
  });

  const torso = box(AVATAR.torso, materials.torso);
  torso.position.y = AVATAR.hipHeight + AVATAR.torso[1] / 2;
  body.add(torso);

  const head = new THREE.Group();
  head.position.y = AVATAR.neckHeight;
  const skull = box([AVATAR.headSize, AVATAR.headSize, AVATAR.headSize], materials.skin);
  skull.position.y = AVATAR.headSize / 2;
  const hairWidth = AVATAR.headSize + HAIR_OVERHANG;
  const hair = box([hairWidth, AVATAR.headSize / 4, hairWidth], materials.hair);
  hair.position.y = AVATAR.headSize;
  const visor = box(AVATAR.visor, materials.visor);
  visor.position.set(0, AVATAR.headSize * 0.6, -AVATAR.headSize / 2);
  head.add(skull, hair, visor);
  body.add(head);

  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * AVATAR.armOffsetX, AVATAR.shoulderHeight, 0);
    const arm = box(AVATAR.arm, materials.torso);
    arm.position.y = -AVATAR.arm[1] / 2;
    shoulder.add(arm);
    body.add(shoulder);
    return shoulder;
  });
  const gun = box(AVATAR.gun, materials.gun);
  gun.position.set(0, -AVATAR.arm[1] - AVATAR.gun[2] / 4, 0);
  gun.rotation.x = -ARM_AIM;
  arms[1].add(gun);
  const flashMesh = box([FLASH_SIZE, FLASH_SIZE, FLASH_SIZE], materials.flash);
  flashMesh.position.set(0, 0, -AVATAR.gun[2] / 2 - FLASH_SIZE / 2);
  flashMesh.visible = false;
  gun.add(flashMesh);

  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = NAME_TAG.canvasWidth;
  tagCanvas.height = NAME_TAG.canvasHeight;
  const tagTexture = new THREE.CanvasTexture(tagCanvas);
  tagTexture.colorSpace = THREE.SRGBColorSpace;
  const tagMaterial = new THREE.SpriteMaterial({ map: tagTexture, depthWrite: false });
  const tag = new THREE.Sprite(tagMaterial);
  tag.scale.set(NAME_TAG.scale[0], NAME_TAG.scale[1], 1);
  tag.position.y = AVATAR.nameTagHeight;
  group.add(tag);

  let walkPhase = 0;
  let flashUntil = -Infinity;
  let tagKey = '';
  const muzzle = new THREE.Vector3();

  return {
    group,
    update: ({
      pose, speed, alive, dt, now,
    }) => {
      group.position.set(pose.p[0], pose.p[1], pose.p[2]);
      group.rotation.y = pose.y;
      body.rotation.x = alive ? 0 : DEATH_TILT;
      tag.visible = alive;
      walkPhase += speed * dt * LEG_SWING.frequency * Math.PI * 2;
      const swing = alive
        ? Math.sin(walkPhase) * LEG_SWING.amplitude * Math.min(1, speed / LEG_SWING.fullSpeed)
        : 0;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      head.rotation.x = alive ? pose.x : 0;
      arms.forEach((shoulder) => { shoulder.rotation.x = alive ? ARM_AIM + pose.x : 0; });
      flashMesh.visible = alive && now < flashUntil;
    },
    setName: (name, color) => {
      const key = `${name}|${color}`;
      if (key === tagKey) return;
      tagKey = key;
      drawNameTag(tagCanvas, name, color);
      tagTexture.needsUpdate = true;
    },
    flash: (now) => { flashUntil = now + REMOTE_FLASH_MS; },
    muzzlePosition: () => {
      flashMesh.getWorldPosition(muzzle);
      return [muzzle.x, muzzle.y, muzzle.z];
    },
    dispose: () => {
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      Object.values(materials).forEach((material) => material.dispose());
      tagMaterial.dispose();
      tagTexture.dispose();
    },
  };
};
