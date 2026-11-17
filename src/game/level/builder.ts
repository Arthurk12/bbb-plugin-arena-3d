import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { modelGeometry } from '../models/service';
import {
  AMBIENT_OCCLUSION, AMMO_BOX_PARTS, AMMO_COLOR, GLOW_COLORS, LEVEL_ANIMATION, PICKUP_COLOR,
  PICKUP_GLOW, SLIME_OPACITY, TEXTURE_WORLD_SIZE,
} from './constants';
import { createSky } from './sky';
import { createLevelTextures } from './textures';
import {
  BuiltLevel, LevelBlock, LevelDefinition, MaterialId, PickupDefinition,
} from './types';

const PICKUP_SIZE = 0.5;
const PICKUP_CROSS_THICKNESS = 0.16;
const PICKUP_FLOAT_HEIGHT = 0.6;
const AXIS_NORMAL = 0.5;
const NEON_MATERIALS: MaterialId[] = ['neonPink', 'neonCyan'];

/** Brightness of a vertex: darker at the foot of a side face, fading out with height. */
export const occlusionAt = (normalY: number, heightAboveFoot: number): number => {
  if (normalY > AXIS_NORMAL) return 1;
  if (normalY < -AXIS_NORMAL) return AMBIENT_OCCLUSION.bottom;
  const t = Math.min(1, Math.max(0, heightAboveFoot / AMBIENT_OCCLUSION.height));
  const smooth = t * t * (3 - 2 * t);
  return AMBIENT_OCCLUSION.base + (1 - AMBIENT_OCCLUSION.base) * smooth;
};

/**
 * A box with world-aligned texture coordinates (the texture repeats every TEXTURE_WORLD_SIZE
 * meters and lines up across neighbouring blocks) and, when `shaded`, ambient occlusion baked
 * into its vertex colors: computed once here, free while playing.
 */
const blockGeometry = (block: LevelBlock, shaded: boolean): THREE.BufferGeometry => {
  const width = block.max[0] - block.min[0];
  const height = block.max[1] - block.min[1];
  const depth = block.max[2] - block.min[2];
  const heightSegments = shaded ? Math.max(1, Math.ceil(height / AMBIENT_OCCLUSION.segment)) : 1;
  const geometry = new THREE.BoxGeometry(width, height, depth, 1, heightSegments, 1);
  geometry.translate(
    (block.min[0] + block.max[0]) / 2,
    (block.min[1] + block.max[1]) / 2,
    (block.min[2] + block.max[2]) / 2,
  );
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (Math.abs(normal.getX(i)) > AXIS_NORMAL) {
      uv.setXY(i, z / TEXTURE_WORLD_SIZE, y / TEXTURE_WORLD_SIZE);
    } else if (Math.abs(normal.getY(i)) > AXIS_NORMAL) {
      uv.setXY(i, x / TEXTURE_WORLD_SIZE, z / TEXTURE_WORLD_SIZE);
    } else {
      uv.setXY(i, x / TEXTURE_WORLD_SIZE, y / TEXTURE_WORLD_SIZE);
    }
    const shade = shaded ? occlusionAt(normal.getY(i), y - block.min[1]) : 1;
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
};

const materialFor = (
  material: MaterialId,
  textures: Partial<Record<MaterialId, THREE.Texture>>,
): THREE.MeshBasicMaterial | THREE.MeshLambertMaterial => {
  const glow = GLOW_COLORS[material];
  if (glow !== undefined) {
    const transparent = material === 'slime';
    return new THREE.MeshBasicMaterial({
      color: glow,
      map: textures[material] ?? null,
      transparent,
      opacity: transparent ? SLIME_OPACITY : 1,
    });
  }
  return new THREE.MeshLambertMaterial({ map: textures[material] ?? null, vertexColors: true });
};

const groupByMaterial = (blocks: LevelBlock[]) => blocks.reduce((groups, block) => {
  const list = groups.get(block.material) ?? [];
  list.push(block);
  groups.set(block.material, list);
  return groups;
}, new Map<MaterialId, LevelBlock[]>());

/** A health kit: a cross, as one geometry. */
const createPickupGeometry = (): THREE.BufferGeometry => {
  const parts = [
    new THREE.BoxGeometry(PICKUP_SIZE, PICKUP_CROSS_THICKNESS, PICKUP_CROSS_THICKNESS),
    new THREE.BoxGeometry(PICKUP_CROSS_THICKNESS, PICKUP_SIZE, PICKUP_CROSS_THICKNESS),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('pickup parts could not be merged');
  return merged;
};

const createGlowTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = PICKUP_GLOW.textureSize;
  canvas.height = PICKUP_GLOW.textureSize;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const radius = PICKUP_GLOW.textureSize / 2;
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, PICKUP_GLOW.textureSize, PICKUP_GLOW.textureSize);
  }
  return new THREE.CanvasTexture(canvas);
};

/** Every block of a material becomes one merged mesh: a handful of draw calls for the level. */
export const buildLevel = (level: LevelDefinition): BuiltLevel => {
  const group = new THREE.Group();
  const textures = createLevelTextures();
  const byMaterial = groupByMaterial([...level.blocks, ...level.decor]);
  const materials = new Map<MaterialId, THREE.MeshBasicMaterial | THREE.MeshLambertMaterial>();
  [...byMaterial.entries()].forEach(([material, blocks]) => {
    const shaded = GLOW_COLORS[material] === undefined;
    const parts = blocks.map((block) => blockGeometry(block, shaded));
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!merged) return;
    const built = materialFor(material, textures);
    materials.set(material, built);
    group.add(new THREE.Mesh(merged, built));
  });

  // Health kits and ammo boxes: one instanced mesh per kind, and every glow in one point cloud.
  const pickupBaseY = level.pickups.map((pickup) => pickup.position[1] + PICKUP_FLOAT_HEIGHT);
  const ofKind = (kind: PickupDefinition['kind']) => level.pickups
    .filter((pickup) => pickup.kind === kind).length;
  const kitMesh = new THREE.InstancedMesh(
    createPickupGeometry(),
    new THREE.MeshBasicMaterial({ color: PICKUP_COLOR }),
    ofKind('health'),
  );
  const boxMesh = new THREE.InstancedMesh(
    modelGeometry(AMMO_BOX_PARTS),
    new THREE.MeshBasicMaterial({ vertexColors: true }),
    ofKind('ammo'),
  );
  [kitMesh, boxMesh].forEach((mesh) => {
    // eslint-disable-next-line no-param-reassign
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
  });
  /** Each pickup's mesh and its slot there. */
  const slots = level.pickups.map((pickup, i) => ({
    mesh: pickup.kind === 'health' ? kitMesh : boxMesh,
    slot: level.pickups.slice(0, i).filter((other) => other.kind === pickup.kind).length,
  }));
  const pickupOn = level.pickups.map(() => true);
  const pickupMatrix = new THREE.Matrix4();

  const glowPositions = new Float32Array(level.pickups.length * 3);
  const glowColors = new Float32Array(level.pickups.length * 3);
  const glowColorsBase = level.pickups.map((pickup) => new THREE.Color(
    pickup.kind === 'health' ? PICKUP_COLOR : AMMO_COLOR,
  ));
  level.pickups.forEach((pickup, i) => {
    const color = glowColorsBase[i];
    glowPositions.set([pickup.position[0], pickupBaseY[i], pickup.position[2]], i * 3);
    glowColors.set([color.r, color.g, color.b], i * 3);
  });
  const glowGeometry = new THREE.BufferGeometry();
  const glowPositionAttribute = new THREE.BufferAttribute(glowPositions, 3);
  const glowColorAttribute = new THREE.BufferAttribute(glowColors, 3);
  glowGeometry.setAttribute('position', glowPositionAttribute);
  glowGeometry.setAttribute('color', glowColorAttribute);
  const glow = new THREE.Points(glowGeometry, new THREE.PointsMaterial({
    size: PICKUP_GLOW.size,
    map: createGlowTexture(),
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  group.add(glow);

  const sky = createSky();
  group.add(sky.mesh);

  const neon = NEON_MATERIALS
    .map((id) => materials.get(id))
    .filter((material): material is THREE.MeshBasicMaterial | THREE.MeshLambertMaterial => !!material)
    .map((material, i) => ({ material, base: material.color.clone(), phase: i * Math.PI }));

  const animate = (now: number, viewer: THREE.Vector3) => {
    sky.update(now, viewer);
    neon.forEach(({ material, base, phase }) => {
      const wave = 0.5 + 0.5 * Math.sin(now * LEVEL_ANIMATION.neonPulsePerMs + phase);
      material.color.copy(base).multiplyScalar(1 - LEVEL_ANIMATION.neonDepth * (1 - wave));
    });
    if (textures.pad) textures.pad.offset.y = (now * LEVEL_ANIMATION.padScrollPerMs) % 1;
    if (textures.slime) {
      textures.slime.offset.set(
        (now * LEVEL_ANIMATION.slimeScrollPerMs) % 1,
        (now * LEVEL_ANIMATION.slimeScrollPerMs * 0.7) % 1,
      );
    }
    level.pickups.forEach((pickup, i) => {
      const bob = Math.sin(now * LEVEL_ANIMATION.pickupBobPerMs + i) * LEVEL_ANIMATION.pickupBobHeight;
      if (pickupOn[i]) {
        pickupMatrix.makeRotationY(now * LEVEL_ANIMATION.pickupSpinPerMs + i)
          .setPosition(pickup.position[0], pickupBaseY[i] + bob, pickup.position[2]);
      } else {
        pickupMatrix.makeScale(0, 0, 0);
      }
      slots[i].mesh.setMatrixAt(slots[i].slot, pickupMatrix);
      glowPositions[i * 3 + 1] = pickupBaseY[i] + bob;
    });
    kitMesh.instanceMatrix.needsUpdate = true;
    boxMesh.instanceMatrix.needsUpdate = true;
    glowPositionAttribute.needsUpdate = true;
  };

  /** A taken pickup disappears with its glow until it respawns. */
  const setPickupAvailable = (index: number, on: boolean) => {
    if (pickupOn[index] === on) return;
    pickupOn[index] = on;
    const scale = on ? 1 : 0;
    const color = glowColorsBase[index];
    glowColors.set([color.r * scale, color.g * scale, color.b * scale], index * 3);
    glowColorAttribute.needsUpdate = true;
  };

  return { group, animate, setPickupAvailable };
};
