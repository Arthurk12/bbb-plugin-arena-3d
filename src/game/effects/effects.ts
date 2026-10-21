import * as THREE from 'three';
import { Vec3 } from '../../commons/types';
import {
  SPARK_COLORS, SPARK_LIFETIME_MS, SPARK_SIZE, TRACER_LIFETIME_MS,
} from './constants';
import { Effects } from './types';

interface LiveEffect {
  object: THREE.Mesh | THREE.Line;
  material: THREE.Material;
  bornAt: number;
  lifetime: number;
  /** Fades opacity (tracers) or shrinks (sparks). */
  kind: 'fade' | 'shrink';
}

/** Short-lived shot effects: tracers and impact sparks. */
export const createEffects = (scene: THREE.Scene): Effects => {
  const live: LiveEffect[] = [];
  const sparkGeometry = new THREE.BoxGeometry(SPARK_SIZE, SPARK_SIZE, SPARK_SIZE);
  const sparkMaterials = {
    wall: new THREE.MeshBasicMaterial({ color: SPARK_COLORS.wall }),
    player: new THREE.MeshBasicMaterial({ color: SPARK_COLORS.player }),
  };

  const remove = (effect: LiveEffect) => {
    scene.remove(effect.object);
    if (effect.kind === 'fade') {
      effect.object.geometry.dispose();
      effect.material.dispose();
    }
  };

  return {
    tracer: (from: Vec3, to: Vec3, color: number, now: number) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...from), new THREE.Vector3(...to),
      ]);
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      live.push({
        object: line, material, bornAt: now, lifetime: TRACER_LIFETIME_MS, kind: 'fade',
      });
    },
    spark: (at: Vec3, onPlayer: boolean, now: number) => {
      const material = onPlayer ? sparkMaterials.player : sparkMaterials.wall;
      const mesh = new THREE.Mesh(sparkGeometry, material);
      mesh.position.set(at[0], at[1], at[2]);
      scene.add(mesh);
      live.push({
        object: mesh, material, bornAt: now, lifetime: SPARK_LIFETIME_MS, kind: 'shrink',
      });
    },
    update: (now: number) => {
      for (let i = live.length - 1; i >= 0; i -= 1) {
        const effect = live[i];
        const progress = (now - effect.bornAt) / effect.lifetime;
        if (progress >= 1) {
          remove(effect);
          live.splice(i, 1);
        } else if (effect.kind === 'fade') {
          effect.material.opacity = 1 - progress;
        } else {
          effect.object.scale.setScalar(1 - progress);
        }
      }
    },
    dispose: () => {
      live.forEach(remove);
      live.length = 0;
      sparkGeometry.dispose();
      Object.values(sparkMaterials).forEach((material) => material.dispose());
    },
  };
};
