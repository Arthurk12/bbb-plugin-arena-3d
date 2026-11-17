import * as THREE from 'three';
import { Vec3 } from '../../commons/types';
import { Aabb } from '../geometry/types';
import {
  DECALS, PARTICLES, SPARK_COLORS, TRACERS,
} from './constants';
import { Effects } from './types';

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const AXES = 3;

/**
 * Which face of the level an impact lies on: the outward normal written into `out`, or false
 * when the point is in the air (a shot that reached its range).
 */
export const surfaceNormalAt = (point: Vec3, solids: Aabb[], out: THREE.Vector3): boolean => {
  const tolerance = DECALS.surfaceTolerance;
  for (let s = 0; s < solids.length; s += 1) {
    const { min, max } = solids[s];
    let inside = true;
    for (let a = 0; a < AXES; a += 1) {
      if (point[a] < min[a] - tolerance || point[a] > max[a] + tolerance) inside = false;
    }
    if (inside) {
      let best = Infinity;
      for (let a = 0; a < AXES; a += 1) {
        const toMin = Math.abs(point[a] - min[a]);
        const toMax = Math.abs(point[a] - max[a]);
        if (toMin < best) {
          best = toMin;
          out.set(0, 0, 0).setComponent(a, -1);
        }
        if (toMax < best) {
          best = toMax;
          out.set(0, 0, 0).setComponent(a, 1);
        }
      }
      if (best <= tolerance) return true;
    }
  }
  return false;
};

const createDotTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = PARTICLES.textureSize;
  canvas.height = PARTICLES.textureSize;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const radius = PARTICLES.textureSize / 2;
    const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, PARTICLES.textureSize, PARTICLES.textureSize);
  }
  return new THREE.CanvasTexture(canvas);
};

/**
 * Shot effects in three draw calls, whatever happens: instanced tracers, one point cloud of
 * impact particles, instanced bullet marks. Every pool is allocated up front and reused, so a
 * firefight allocates nothing. Additive effects fade by darkening (black adds nothing).
 */
export const createEffects = (scene: THREE.Scene, solids: Aabb[]): Effects => {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const color = new THREE.Color();

  // ---- tracers ----
  const tracerGeometry = new THREE.BoxGeometry(1, 1, 1);
  const tracerMaterial = new THREE.MeshBasicMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const tracers = new THREE.InstancedMesh(tracerGeometry, tracerMaterial, TRACERS.capacity);
  tracers.frustumCulled = false;
  tracers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const tracerBorn = new Float64Array(TRACERS.capacity).fill(-Infinity);
  const tracerColors = new Float32Array(TRACERS.capacity * 3);
  let nextTracer = 0;
  for (let i = 0; i < TRACERS.capacity; i += 1) {
    tracers.setMatrixAt(i, HIDDEN);
    tracers.setColorAt(i, color.setRGB(0, 0, 0));
  }
  scene.add(tracers);

  // ---- particles ----
  const particlePositions = new Float32Array(PARTICLES.capacity * 3);
  const particleColors = new Float32Array(PARTICLES.capacity * 3);
  const particleVelocities = new Float32Array(PARTICLES.capacity * 3);
  const particleBase = new Float32Array(PARTICLES.capacity * 3);
  const particleBorn = new Float64Array(PARTICLES.capacity).fill(-Infinity);
  let nextParticle = 0;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositionAttribute = new THREE.BufferAttribute(particlePositions, 3)
    .setUsage(THREE.DynamicDrawUsage);
  const particleColorAttribute = new THREE.BufferAttribute(particleColors, 3)
    .setUsage(THREE.DynamicDrawUsage);
  particleGeometry.setAttribute('position', particlePositionAttribute);
  particleGeometry.setAttribute('color', particleColorAttribute);
  const dotTexture = createDotTexture();
  const particleMaterial = new THREE.PointsMaterial({
    size: PARTICLES.size,
    map: dotTexture,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  scene.add(particles);

  // ---- decals ----
  const decalGeometry = new THREE.PlaneGeometry(DECALS.size, DECALS.size);
  const decalMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: DECALS.opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const decals = new THREE.InstancedMesh(decalGeometry, decalMaterial, DECALS.capacity);
  decals.frustumCulled = false;
  decals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const decalBorn = new Float64Array(DECALS.capacity).fill(-Infinity);
  const decalMatrices = Array.from({ length: DECALS.capacity }, () => HIDDEN.clone());
  let nextDecal = 0;
  for (let i = 0; i < DECALS.capacity; i += 1) decals.setMatrixAt(i, HIDDEN);
  scene.add(decals);

  let lastUpdate = -Infinity;

  const tracer = (from: Vec3, to: Vec3, tint: number, now: number) => {
    const slot = nextTracer;
    nextTracer = (nextTracer + 1) % TRACERS.capacity;
    direction.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const length = direction.length();
    if (length <= 0) return;
    direction.divideScalar(length);
    position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
    quaternion.setFromUnitVectors(Z_AXIS, direction);
    scale.set(TRACERS.thickness, TRACERS.thickness, length);
    tracers.setMatrixAt(slot, matrix.compose(position, quaternion, scale));
    color.setHex(tint);
    tracerColors[slot * 3] = color.r;
    tracerColors[slot * 3 + 1] = color.g;
    tracerColors[slot * 3 + 2] = color.b;
    tracers.setColorAt(slot, color);
    tracerBorn[slot] = now;
    tracers.instanceMatrix.needsUpdate = true;
    if (tracers.instanceColor) tracers.instanceColor.needsUpdate = true;
  };

  const burst = (at: Vec3, tint: number, now: number) => {
    color.setHex(tint);
    for (let n = 0; n < PARTICLES.perImpact; n += 1) {
      const slot = nextParticle;
      nextParticle = (nextParticle + 1) % PARTICLES.capacity;
      const i = slot * 3;
      particlePositions[i] = at[0];
      particlePositions[i + 1] = at[1];
      particlePositions[i + 2] = at[2];
      particleVelocities[i] = (Math.random() * 2 - 1) * PARTICLES.speed;
      particleVelocities[i + 1] = Math.random() * PARTICLES.speed;
      particleVelocities[i + 2] = (Math.random() * 2 - 1) * PARTICLES.speed;
      particleBase[i] = color.r;
      particleBase[i + 1] = color.g;
      particleBase[i + 2] = color.b;
      particleBorn[slot] = now;
    }
  };

  const decal = (at: Vec3, now: number) => {
    const slot = nextDecal;
    nextDecal = (nextDecal + 1) % DECALS.capacity;
    position.set(
      at[0] + normal.x * DECALS.offset,
      at[1] + normal.y * DECALS.offset,
      at[2] + normal.z * DECALS.offset,
    );
    quaternion.setFromUnitVectors(Z_AXIS, normal);
    decalMatrices[slot].compose(position, quaternion, scale.set(1, 1, 1));
    decals.setMatrixAt(slot, decalMatrices[slot]);
    decalBorn[slot] = now;
    decals.instanceMatrix.needsUpdate = true;
  };

  const spark = (at: Vec3, onPlayer: boolean, now: number) => {
    if (onPlayer) {
      burst(at, SPARK_COLORS.player, now);
      return;
    }
    // A shot that reached its range in the air leaves nothing.
    if (!surfaceNormalAt(at, solids, normal)) return;
    burst(at, SPARK_COLORS.wall, now);
    decal(at, now);
  };

  const updateTracers = (now: number) => {
    let changed = false;
    for (let slot = 0; slot < TRACERS.capacity; slot += 1) {
      if (tracerBorn[slot] !== -Infinity) {
        const progress = (now - tracerBorn[slot]) / TRACERS.lifetimeMs;
        if (progress >= 1) {
          tracerBorn[slot] = -Infinity;
          tracers.setMatrixAt(slot, HIDDEN);
          tracers.instanceMatrix.needsUpdate = true;
        } else {
          const fade = 1 - progress;
          tracers.setColorAt(slot, color.setRGB(
            tracerColors[slot * 3] * fade,
            tracerColors[slot * 3 + 1] * fade,
            tracerColors[slot * 3 + 2] * fade,
          ));
        }
        changed = true;
      }
    }
    if (changed && tracers.instanceColor) tracers.instanceColor.needsUpdate = true;
  };

  const updateParticles = (now: number, dt: number) => {
    let changed = false;
    for (let slot = 0; slot < PARTICLES.capacity; slot += 1) {
      if (particleBorn[slot] !== -Infinity) {
        const i = slot * 3;
        const progress = (now - particleBorn[slot]) / PARTICLES.lifetimeMs;
        if (progress >= 1) {
          particleBorn[slot] = -Infinity;
          particleColors[i] = 0;
          particleColors[i + 1] = 0;
          particleColors[i + 2] = 0;
        } else {
          particleVelocities[i + 1] -= PARTICLES.gravity * dt;
          particlePositions[i] += particleVelocities[i] * dt;
          particlePositions[i + 1] += particleVelocities[i + 1] * dt;
          particlePositions[i + 2] += particleVelocities[i + 2] * dt;
          const fade = 1 - progress;
          particleColors[i] = particleBase[i] * fade;
          particleColors[i + 1] = particleBase[i + 1] * fade;
          particleColors[i + 2] = particleBase[i + 2] * fade;
        }
        changed = true;
      }
    }
    if (changed) {
      particlePositionAttribute.needsUpdate = true;
      particleColorAttribute.needsUpdate = true;
    }
  };

  const updateDecals = (now: number) => {
    let changed = false;
    for (let slot = 0; slot < DECALS.capacity; slot += 1) {
      if (decalBorn[slot] !== -Infinity) {
        const age = now - decalBorn[slot];
        if (age >= DECALS.lifetimeMs) {
          decalBorn[slot] = -Infinity;
          decals.setMatrixAt(slot, HIDDEN);
          changed = true;
        } else if (age > DECALS.lifetimeMs - DECALS.fadeMs) {
          const shrink = (DECALS.lifetimeMs - age) / DECALS.fadeMs;
          // The mark's own matrix, shrunk in the wall's plane.
          matrix.makeScale(shrink, shrink, 1).premultiply(decalMatrices[slot]);
          decals.setMatrixAt(slot, matrix);
          changed = true;
        }
      }
    }
    if (changed) decals.instanceMatrix.needsUpdate = true;
  };

  return {
    tracer,
    spark,
    update: (now: number) => {
      const dt = lastUpdate === -Infinity ? 0 : Math.max(0, (now - lastUpdate) / 1000);
      lastUpdate = now;
      updateTracers(now);
      updateParticles(now, dt);
      updateDecals(now);
    },
    dispose: () => {
      [tracers, particles, decals].forEach((object) => scene.remove(object));
      tracers.dispose();
      decals.dispose();
      tracerGeometry.dispose();
      particleGeometry.dispose();
      decalGeometry.dispose();
      tracerMaterial.dispose();
      particleMaterial.dispose();
      decalMaterial.dispose();
      dotTexture.dispose();
    },
  };
};
