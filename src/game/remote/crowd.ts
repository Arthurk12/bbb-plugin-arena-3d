import * as THREE from 'three';
import { WEAPON_IDS } from '../weapons/constants';
import {
  ARM_AIM, AVATAR, AVATAR_COLORS, CROWD_CAPACITY, DEATH_TILT, FLASH_SIZE, LEG_SWING, NAME_TAG,
  REMOTE_FLASH_MS, SHADOW, USER_COLOR_SL,
} from './constants';
import { buildAvatarParts, muzzleLocal } from './geometry';
import { truncateName, userHue } from './service';
import { AvatarCrowd, AvatarFrame, RemoteAvatar } from './types';

const LEGS_PER_PLAYER = 2;

/** Only vertices with `tint` 1 take the instance (player) color; the rest keep their own. */
const TINT_DECLARATION = 'attribute float tint;\n';
const INSTANCE_COLOR_LINE = 'vColor.rgb *= instanceColor.rgb;';
const TINTED_INSTANCE_COLOR_LINE = 'vColor.rgb *= mix( vec3( 1.0 ), instanceColor.rgb, tint );';

/** The arms carry every gun; a gun's vertices collapse unless its player holds it. */
const HELD_WEAPON_DECLARATION = 'attribute float weapon;\nattribute float heldWeapon;\n';
const HIDE_OTHER_WEAPONS = '#include <begin_vertex>\n'
  + 'if ( weapon > 0.5 && abs( weapon - heldWeapon ) > 0.5 ) transformed = vec3( 0.0 );';

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const WHITE = new THREE.Color(1, 1, 1);

interface Member {
  slot: number;
  removed: boolean;
  color: THREE.Color;
  walkPhase: number;
  /** Index of the weapon in hand. */
  weapon: number;
  flashUntil: number;
  torso: THREE.Matrix4;
  head: THREE.Matrix4;
  arms: THREE.Matrix4;
  legLeft: THREE.Matrix4;
  legRight: THREE.Matrix4;
  flash: THREE.Matrix4;
  shadow: THREE.Matrix4;
  tag: THREE.Sprite;
  tagCanvas: HTMLCanvasElement;
  tagTexture: THREE.CanvasTexture;
  tagMaterial: THREE.SpriteMaterial;
  tagKey: string;
}

const NOOP_AVATAR: RemoteAvatar = {
  update: () => {},
  setName: () => {},
  flash: () => {},
  muzzlePosition: () => [0, 0, 0],
  dispose: () => {},
};

/**
 * Lambert with baked vertex colors, where the player's color reaches only the cloth. The arms'
 * material (`holdsWeapons`) also shows only the gun each player holds.
 */
const createBodyMaterial = (holdsWeapons = false): THREE.MeshLambertMaterial => {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    const colorVertex = THREE.ShaderChunk.color_vertex
      .replace(INSTANCE_COLOR_LINE, TINTED_INSTANCE_COLOR_LINE);
    const vertexShader = TINT_DECLARATION
      + shader.vertexShader.replace('#include <color_vertex>', colorVertex);
    // eslint-disable-next-line no-param-reassign
    shader.vertexShader = holdsWeapons
      ? HELD_WEAPON_DECLARATION
        + vertexShader.replace('#include <begin_vertex>', HIDE_OTHER_WEAPONS)
      : vertexShader;
  };
  // Both variants share the callback's source, which three.js would take as the same program.
  material.customProgramCacheKey = () => (holdsWeapons ? 'arena-arms' : 'arena-body');
  return material;
};

const createShadowTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = SHADOW.textureSize;
  canvas.height = SHADOW.textureSize;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const radius = SHADOW.textureSize / 2;
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SHADOW.textureSize, SHADOW.textureSize);
  }
  return new THREE.CanvasTexture(canvas);
};

const drawNameTag = (canvas: HTMLCanvasElement, name: string, color: string) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = NAME_TAG.background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = color;
  ctx.lineWidth = NAME_TAG.border;
  const inset = NAME_TAG.border / 2;
  ctx.strokeRect(inset, inset, width - NAME_TAG.border, height - NAME_TAG.border);
  ctx.font = NAME_TAG.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = NAME_TAG.text;
  ctx.fillText(truncateName(name, NAME_TAG.maxChars), width / 2, height / 2);
};

/**
 * Every remote player in a handful of draw calls: one instanced mesh per body part, shared by
 * all players, plus a name tag each. Nothing is allocated per frame.
 */
export const createAvatarCrowd = (
  scene: THREE.Scene,
  capacity = CROWD_CAPACITY,
): AvatarCrowd => {
  const parts = buildAvatarParts();
  const bodyMaterial = createBodyMaterial();
  const armsMaterial = createBodyMaterial(true);
  const flashGeometry = new THREE.BoxGeometry(FLASH_SIZE, FLASH_SIZE, FLASH_SIZE);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: AVATAR_COLORS.flash,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shadowGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const shadowTexture = createShadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: SHADOW.opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  const instanced = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number,
    colored: boolean,
  ) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.count = 0;
    // Players move all over the level every frame: culling would need a new bounding sphere
    // each frame, and the whole crowd is only a few draw calls anyway.
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Creates the color buffer before the first render, so the shader is built with it.
    if (colored) mesh.setColorAt(0, WHITE);
    scene.add(mesh);
    return mesh;
  };

  const legs = instanced(parts.leg, bodyMaterial, capacity * LEGS_PER_PLAYER, true);
  const torsos = instanced(parts.torso, bodyMaterial, capacity, true);
  const heads = instanced(parts.head, bodyMaterial, capacity, true);
  const arms = instanced(parts.arms, armsMaterial, capacity, true);
  const heldWeapons = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
  heldWeapons.setUsage(THREE.DynamicDrawUsage);
  parts.arms.setAttribute('heldWeapon', heldWeapons);
  const flashes = instanced(flashGeometry, flashMaterial, capacity, false);
  const shadows = instanced(shadowGeometry, shadowMaterial, capacity, false);
  const meshes = [legs, torsos, heads, arms, flashes, shadows];
  const coloredMeshes = [legs, torsos, heads, arms];

  const members: Member[] = [];
  const muzzles = WEAPON_IDS.map((id) => muzzleLocal(id));
  const step = new THREE.Matrix4();
  const point = new THREE.Vector3();

  const setCounts = () => {
    meshes.forEach((mesh) => {
      // eslint-disable-next-line no-param-reassign
      mesh.count = members.length * (mesh === legs ? LEGS_PER_PLAYER : 1);
    });
  };

  const writeMatrices = (member: Member) => {
    const { slot } = member;
    torsos.setMatrixAt(slot, member.torso);
    heads.setMatrixAt(slot, member.head);
    arms.setMatrixAt(slot, member.arms);
    legs.setMatrixAt(slot * LEGS_PER_PLAYER, member.legLeft);
    legs.setMatrixAt(slot * LEGS_PER_PLAYER + 1, member.legRight);
    flashes.setMatrixAt(slot, member.flash);
    shadows.setMatrixAt(slot, member.shadow);
    heldWeapons.setX(slot, member.weapon + 1);
    heldWeapons.needsUpdate = true;
    meshes.forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  };

  const writeColor = (member: Member) => {
    const { slot } = member;
    torsos.setColorAt(slot, member.color);
    heads.setColorAt(slot, member.color);
    arms.setColorAt(slot, member.color);
    legs.setColorAt(slot * LEGS_PER_PLAYER, member.color);
    legs.setColorAt(slot * LEGS_PER_PLAYER + 1, member.color);
    coloredMeshes.forEach((mesh) => {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  };

  /** `out` = `parent`, moved to (x, y, 0) and turned `angle` around x. */
  const pivot = (out: THREE.Matrix4, parent: THREE.Matrix4, x: number, y: number, angle: number) => {
    out.copy(parent);
    out.multiply(step.makeTranslation(x, y, 0));
    out.multiply(step.makeRotationX(angle));
  };

  const update = (member: Member, frame: AvatarFrame) => {
    if (member.removed) return;
    const {
      pose, speed, alive, dt, now, viewerDistance, weapon,
    } = frame;
    // eslint-disable-next-line no-param-reassign
    member.weapon = weapon;
    const muzzle = muzzles[weapon] ?? muzzles[0];
    const [x, y, z] = pose.p;
    member.torso.makeRotationY(pose.y).setPosition(x, y, z);
    member.torso.multiply(step.makeRotationX(alive ? 0 : DEATH_TILT));

    // eslint-disable-next-line no-param-reassign
    member.walkPhase += speed * dt * LEG_SWING.frequency * Math.PI * 2;
    const swing = alive
      ? Math.sin(member.walkPhase) * LEG_SWING.amplitude * Math.min(1, speed / LEG_SWING.fullSpeed)
      : 0;
    pivot(member.legLeft, member.torso, -AVATAR.legOffsetX, AVATAR.hipHeight, swing);
    pivot(member.legRight, member.torso, AVATAR.legOffsetX, AVATAR.hipHeight, -swing);
    pivot(member.head, member.torso, 0, AVATAR.neckHeight, alive ? pose.x : 0);
    pivot(member.arms, member.torso, 0, AVATAR.shoulderHeight, alive ? ARM_AIM + pose.x : 0);

    if (alive && now < member.flashUntil) {
      member.flash.copy(member.arms).multiply(step.makeTranslation(muzzle[0], muzzle[1], muzzle[2]));
    } else {
      member.flash.copy(HIDDEN);
    }
    member.shadow.makeScale(SHADOW.size, 1, SHADOW.size).setPosition(x, y + SHADOW.lift, z);
    member.tag.position.set(x, y + AVATAR.nameTagHeight, z);
    // eslint-disable-next-line no-param-reassign
    member.tag.visible = alive && viewerDistance <= NAME_TAG.maxDistance;
    writeMatrices(member);
  };

  const remove = (member: Member) => {
    if (member.removed) return;
    // eslint-disable-next-line no-param-reassign
    member.removed = true;
    // Keep the instances dense: the last player takes the freed slot.
    const last = members.pop()!;
    if (last !== member) {
      members[member.slot] = last;
      last.slot = member.slot;
      writeMatrices(last);
      writeColor(last);
    }
    setCounts();
    scene.remove(member.tag);
    member.tagMaterial.dispose();
    member.tagTexture.dispose();
  };

  const add = (userId: string): RemoteAvatar => {
    if (members.length >= capacity) return NOOP_AVATAR;
    const tagCanvas = document.createElement('canvas');
    tagCanvas.width = NAME_TAG.canvasWidth;
    tagCanvas.height = NAME_TAG.canvasHeight;
    const tagTexture = new THREE.CanvasTexture(tagCanvas);
    tagTexture.colorSpace = THREE.SRGBColorSpace;
    const tagMaterial = new THREE.SpriteMaterial({ map: tagTexture, depthWrite: false });
    const tag = new THREE.Sprite(tagMaterial);
    tag.scale.set(NAME_TAG.scale[0], NAME_TAG.scale[1], 1);
    tag.visible = false;
    scene.add(tag);

    const member: Member = {
      slot: members.length,
      removed: false,
      color: new THREE.Color().setHSL(userHue(userId), USER_COLOR_SL[0], USER_COLOR_SL[1]),
      walkPhase: 0,
      weapon: 0,
      flashUntil: -Infinity,
      // Hidden until the first update places them.
      torso: HIDDEN.clone(),
      head: HIDDEN.clone(),
      arms: HIDDEN.clone(),
      legLeft: HIDDEN.clone(),
      legRight: HIDDEN.clone(),
      flash: HIDDEN.clone(),
      shadow: HIDDEN.clone(),
      tag,
      tagCanvas,
      tagTexture,
      tagMaterial,
      tagKey: '',
    };
    members.push(member);
    setCounts();
    writeMatrices(member);
    writeColor(member);

    return {
      update: (frame) => update(member, frame),
      setName: (name, color) => {
        const key = `${name}|${color}`;
        if (key === member.tagKey) return;
        member.tagKey = key;
        drawNameTag(member.tagCanvas, name, color);
        member.tagTexture.needsUpdate = true;
      },
      flash: (now) => { member.flashUntil = now + REMOTE_FLASH_MS; },
      muzzlePosition: () => {
        const muzzle = muzzles[member.weapon] ?? muzzles[0];
        point.set(muzzle[0], muzzle[1], muzzle[2]).applyMatrix4(member.arms);
        return [point.x, point.y, point.z];
      },
      dispose: () => remove(member),
    };
  };

  return {
    add,
    size: () => members.length,
    dispose: () => {
      [...members].forEach(remove);
      meshes.forEach((mesh) => {
        scene.remove(mesh);
        mesh.dispose();
      });
      Object.values(parts).forEach((geometry) => geometry.dispose());
      flashGeometry.dispose();
      shadowGeometry.dispose();
      bodyMaterial.dispose();
      armsMaterial.dispose();
      flashMaterial.dispose();
      shadowMaterial.dispose();
      shadowTexture.dispose();
    },
  };
};
