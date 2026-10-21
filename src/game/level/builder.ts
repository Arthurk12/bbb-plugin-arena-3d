import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  GLOW_COLORS, PICKUP_COLOR, SLIME_OPACITY, TEXTURE_WORLD_SIZE,
} from './constants';
import { createLevelTextures } from './textures';
import {
  BuiltLevel, LevelBlock, LevelDefinition, MaterialId,
} from './types';

const VERTICES_PER_FACE = 4;
const PICKUP_SIZE = 0.5;
const PICKUP_CROSS_THICKNESS = 0.16;
const PICKUP_FLOAT_HEIGHT = 0.6;

/** A box whose texture repeats every TEXTURE_WORLD_SIZE meters on every face. */
const blockGeometry = (block: LevelBlock): THREE.BufferGeometry => {
  const width = block.max[0] - block.min[0];
  const height = block.max[1] - block.min[1];
  const depth = block.max[2] - block.min[2];
  const geometry = new THREE.BoxGeometry(width, height, depth);
  // BoxGeometry faces, in order: +x, -x, +y, -y, +z, -z.
  const faceScales: [number, number][] = [
    [depth, height], [depth, height],
    [width, depth], [width, depth],
    [width, height], [width, height],
  ];
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  faceScales.forEach(([u, v], face) => {
    for (let i = 0; i < VERTICES_PER_FACE; i += 1) {
      const index = face * VERTICES_PER_FACE + i;
      uv.setXY(
        index,
        uv.getX(index) * (u / TEXTURE_WORLD_SIZE),
        uv.getY(index) * (v / TEXTURE_WORLD_SIZE),
      );
    }
  });
  geometry.translate(
    (block.min[0] + block.max[0]) / 2,
    (block.min[1] + block.max[1]) / 2,
    (block.min[2] + block.max[2]) / 2,
  );
  return geometry;
};

const materialFor = (
  material: MaterialId,
  textures: Partial<Record<MaterialId, THREE.Texture>>,
): THREE.Material => {
  const glow = GLOW_COLORS[material];
  if (glow !== undefined) {
    const transparent = material === 'slime';
    return new THREE.MeshBasicMaterial({
      color: glow, transparent, opacity: transparent ? SLIME_OPACITY : 1,
    });
  }
  return new THREE.MeshLambertMaterial({ map: textures[material] ?? null });
};

const groupByMaterial = (blocks: LevelBlock[]) => blocks.reduce((groups, block) => {
  const list = groups.get(block.material) ?? [];
  list.push(block);
  groups.set(block.material, list);
  return groups;
}, new Map<MaterialId, LevelBlock[]>());

const createPickupMesh = (): THREE.Group => {
  const material = new THREE.MeshBasicMaterial({ color: PICKUP_COLOR });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    new THREE.BoxGeometry(PICKUP_SIZE, PICKUP_CROSS_THICKNESS, PICKUP_CROSS_THICKNESS),
    material,
  ));
  group.add(new THREE.Mesh(
    new THREE.BoxGeometry(PICKUP_CROSS_THICKNESS, PICKUP_SIZE, PICKUP_CROSS_THICKNESS),
    material,
  ));
  return group;
};

/** Every block of a material becomes one merged mesh: a handful of draw calls for the level. */
export const buildLevel = (level: LevelDefinition): BuiltLevel => {
  const group = new THREE.Group();
  const textures = createLevelTextures();
  const byMaterial = groupByMaterial([...level.blocks, ...level.decor]);
  [...byMaterial.entries()].forEach(([material, blocks]) => {
    const parts = blocks.map(blockGeometry);
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!merged) return;
    group.add(new THREE.Mesh(merged, materialFor(material, textures)));
  });
  const pickups = level.pickups.map((pickup) => {
    const mesh = createPickupMesh();
    const [x, y, z] = pickup.position;
    mesh.position.set(x, y + PICKUP_FLOAT_HEIGHT, z);
    group.add(mesh);
    return mesh;
  });
  return { group, pickups };
};
