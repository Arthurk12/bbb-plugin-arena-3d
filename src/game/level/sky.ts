import * as THREE from 'three';
import { SKY } from './constants';
import { Sky } from './types';

const VERTEX_SHADER = /* glsl */`
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */`
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 skyline;
uniform vec3 windowColor;
uniform float time;
uniform float buildings;
uniform float skylineMin;
uniform float skylineMax;
uniform float starThreshold;
uniform float starGrid;
uniform vec2 windowGrid;
uniform float windowThreshold;
varying vec3 vDirection;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec3 direction = normalize(vDirection);
  float azimuth = atan(direction.z, direction.x) / 6.2831853 + 0.5;
  vec3 color = mix(horizon, zenith, smoothstep(0.0, 0.7, direction.y));

  // A small dot at the center of a few grid cells, not the whole cell.
  vec2 starUv = vec2(azimuth * starGrid * 4.0, direction.y * starGrid);
  vec2 starCell = floor(starUv);
  float star = step(starThreshold, hash(starCell))
    * smoothstep(0.3, 0.6, direction.y)
    * smoothstep(0.22, 0.05, length(fract(starUv) - 0.5));
  color += star * (0.55 + 0.45 * sin(time * 0.002 + hash(starCell + 7.0) * 6.2831853));

  float building = floor(azimuth * buildings);
  float top = mix(skylineMin, skylineMax, hash(vec2(building, 3.0)));
  if (direction.y < top) {
    color = skyline;
    vec2 windowCell = floor(vec2(azimuth * windowGrid.x, direction.y * windowGrid.y));
    if (hash(windowCell) > windowThreshold && direction.y < top - 0.01) {
      color = windowColor * 0.7;
    }
  }

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * The sky in one draw call: a dome around the camera, drawn first and without depth, with the
 * gradient, stars and skyline all computed in its fragment shader. No textures.
 */
export const createSky = (): Sky => {
  const uniforms = {
    zenith: { value: new THREE.Color(SKY.zenith) },
    horizon: { value: new THREE.Color(SKY.horizon) },
    skyline: { value: new THREE.Color(SKY.skyline) },
    windowColor: { value: new THREE.Color(SKY.window) },
    time: { value: 0 },
    buildings: { value: SKY.buildings },
    skylineMin: { value: SKY.skylineMin },
    skylineMax: { value: SKY.skylineMax },
    starThreshold: { value: SKY.starThreshold },
    starGrid: { value: SKY.starGrid },
    windowGrid: { value: new THREE.Vector2(SKY.windowGrid[0], SKY.windowGrid[1]) },
    windowThreshold: { value: SKY.windowThreshold },
  };
  const geometry = new THREE.SphereGeometry(SKY.radius, SKY.widthSegments, SKY.heightSegments);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // It follows the camera, so it is always in view.
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return {
    mesh,
    update: (now, viewer) => {
      uniforms.time.value = now;
      mesh.position.copy(viewer);
    },
  };
};
