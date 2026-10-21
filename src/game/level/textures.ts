import * as THREE from 'three';
import { TEXTURE_SIZE } from './constants';
import { MaterialId } from './types';

type Painter = (ctx: CanvasRenderingContext2D, size: number, random: () => number) => void;

/** Deterministic noise, so every client draws the same textures. */
const seededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const speckle = (
  ctx: CanvasRenderingContext2D,
  size: number,
  random: () => number,
  colors: string[],
  count: number,
) => {
  for (let i = 0; i < count; i += 1) {
    ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    ctx.fillRect(Math.floor(random() * size), Math.floor(random() * size), 1, 1);
  }
};

const PAINTERS: Partial<Record<MaterialId, Painter>> = {
  floor: (ctx, size, random) => {
    ctx.fillStyle = '#5b5560';
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, random, ['#4f4955', '#686270', '#57515c'], size * 6);
    ctx.fillStyle = '#3d3842';
    const tile = size / 2;
    for (let i = 0; i <= 2; i += 1) {
      ctx.fillRect(i * tile - 1, 0, 2, size);
      ctx.fillRect(0, i * tile - 1, size, 2);
    }
  },
  wall: (ctx, size, random) => {
    ctx.fillStyle = '#7a3b2e';
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const brickHeight = size / rows;
    for (let row = 0; row < rows; row += 1) {
      const offset = row % 2 ? size / 8 : 0;
      for (let col = -1; col < 4; col += 1) {
        const shade = 100 + Math.floor(random() * 40);
        ctx.fillStyle = `rgb(${shade + 20}, ${Math.floor(shade / 2)}, ${Math.floor(shade / 2.6)})`;
        const brickWidth = size / 4;
        const mortar = 1;
        ctx.fillRect(
          col * brickWidth + offset + mortar,
          row * brickHeight + mortar,
          brickWidth - 2 * mortar,
          brickHeight - 2 * mortar,
        );
      }
    }
    speckle(ctx, size, random, ['#5a2a20', '#94503f'], size * 3);
  },
  concrete: (ctx, size, random) => {
    ctx.fillStyle = '#8a8a82';
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, random, ['#7c7c74', '#9a9a91', '#6f6f68'], size * 10);
    ctx.fillStyle = '#6a6a63';
    ctx.fillRect(0, size - 2, size, 2);
  },
  metal: (ctx, size, random) => {
    ctx.fillStyle = '#5d6b78';
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, random, ['#52606c', '#6a7987'], size * 4);
    ctx.fillStyle = '#3e4852';
    ctx.fillRect(0, 0, size, 2);
    ctx.fillRect(0, 0, 2, size);
    ctx.fillStyle = '#a7b4c0';
    [[6, 6], [size - 8, 6], [6, size - 8], [size - 8, size - 8]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 2, 2);
    });
  },
  crate: (ctx, size, random) => {
    ctx.fillStyle = '#9b6b34';
    ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, random, ['#8a5d2b', '#ad7a40'], size * 5);
    ctx.strokeStyle = '#5e3d18';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(size - 4, size - 4);
    ctx.moveTo(size - 4, 4);
    ctx.lineTo(4, size - 4);
    ctx.stroke();
  },
  pad: (ctx, size) => {
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffcc00';
    const stripe = size / 8;
    for (let i = -size; i < size * 2; i += stripe * 2) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + stripe, 0);
      ctx.lineTo(i + stripe - size, size);
      ctx.lineTo(i - size, size);
      ctx.fill();
    }
  },
};

const createTexture = (material: MaterialId, painter: Painter, seed: number): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) painter(ctx, TEXTURE_SIZE, seededRandom(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = material;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

/** One texture per textured material, painted on a canvas: no image downloads. */
export const createLevelTextures = (): Partial<Record<MaterialId, THREE.Texture>> => (
  Object.fromEntries(
    Object.entries(PAINTERS).map(([material, painter], index) => [
      material,
      createTexture(material as MaterialId, painter as Painter, index + 1),
    ]),
  )
);
