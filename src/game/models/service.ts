import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FACE_SHADE } from './constants';
import { ModelPart, ShadedBoxOptions, Triple } from './types';

/** Shade of each BoxGeometry face, in its order: +x, -x, +y, -y, +z, -z. */
const FACE_SHADES = [
  FACE_SHADE.side, FACE_SHADE.side, FACE_SHADE.top, FACE_SHADE.bottom, FACE_SHADE.front,
  FACE_SHADE.front,
];

const VERTICES_PER_FACE = 4;

/** A box with its color baked into the vertices, each face a little lighter or darker. */
export const shadedBox = (
  size: Triple,
  center: Triple,
  color: number,
  { tint = 0, tilt = 0, shaded = true }: ShadedBoxOptions = {},
): THREE.BufferGeometry => {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  if (tilt) geometry.rotateX(tilt);
  geometry.translate(center[0], center[1], center[2]);
  const base = new THREE.Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const shade = shaded ? FACE_SHADES[Math.floor(i / VERTICES_PER_FACE)] : 1;
    colors[i * 3] = base.r * shade;
    colors[i * 3 + 1] = base.g * shade;
    colors[i * 3 + 2] = base.b * shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(count).fill(tint), 1));
  return geometry;
};

/** One geometry out of several (which are freed). */
export const mergeParts = (parts: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('model parts could not be merged');
  return merged;
};

/** A model's parts as one geometry: glowing parts at full color, the others shaded. */
export const modelGeometry = (parts: ModelPart[]): THREE.BufferGeometry => mergeParts(
  parts.map((part) => shadedBox(part.size, part.at, part.color, {
    tilt: part.tilt, shaded: !part.glow,
  })),
);
