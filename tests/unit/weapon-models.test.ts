import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { modelGeometry } from '../../src/game/models/service';
import { ModelPart, Triple } from '../../src/game/models/types';
import { VIEW_MODEL, WEAPON_IDS } from '../../src/game/weapons/constants';
import { HELD_MODELS, VIEW_MODELS } from '../../src/game/weapons/models';
import { createViewModel } from '../../src/game/weapons/view-model';

/** How far forward (-z) a model's parts reach. */
const front = (parts: ModelPart[]) => Math.min(...parts.map((part) => part.at[2] - part.size[2] / 2));

/** Some slack for a muzzle placed on the barrel's last face. */
const MUZZLE_SLACK = 0.03;

const muzzleAtFront = (parts: ModelPart[], muzzle: Triple) => muzzle[2] <= front(parts) + MUZZLE_SLACK;

describe('weapon models', () => {
  it.each(WEAPON_IDS)('%s is detailed in your hands, with the muzzle at the front', (id) => {
    const model = VIEW_MODELS[id];
    expect(model.parts.length).toBeGreaterThanOrEqual(15);
    expect(muzzleAtFront(model.parts, model.muzzle)).toBe(true);
  });

  it.each(WEAPON_IDS)('%s is simpler in other hands, with the muzzle at the front', (id) => {
    const model = HELD_MODELS[id];
    expect(model.parts.length).toBeGreaterThanOrEqual(4);
    expect(model.parts.length).toBeLessThan(VIEW_MODELS[id].parts.length);
    expect(muzzleAtFront(model.parts, model.muzzle)).toBe(true);
  });

  it('merges a model into one geometry with a color per vertex', () => {
    const geometry = modelGeometry(VIEW_MODELS.blaster.parts);
    const positions = geometry.getAttribute('position').count;
    expect(positions).toBe(VIEW_MODELS.blaster.parts.length * 24);
    expect(geometry.getAttribute('color').count).toBe(positions);
  });
});

describe('createViewModel', () => {
  const shownIndex = (root: THREE.Object3D) => root.children
    .findIndex((child) => child instanceof THREE.Group && child.visible);

  it('lowers the old gun and raises the new one when switching', () => {
    const camera = new THREE.PerspectiveCamera();
    const view = createViewModel(camera);
    const [root] = camera.children;
    expect(shownIndex(root)).toBe(0);

    view.setWeapon('shotgun', 1000);
    view.update(0.016, 0, 1000 + VIEW_MODEL.switchMs * 0.25, true);
    expect(shownIndex(root)).toBe(0);
    expect(root.position.y).toBeLessThan(VIEW_MODEL.rest[1] - VIEW_MODEL.switchDrop * 0.4);

    view.update(0.016, 0, 1000 + VIEW_MODEL.switchMs * 0.75, true);
    expect(shownIndex(root)).toBe(WEAPON_IDS.indexOf('shotgun'));

    view.update(0.016, 0, 1000 + VIEW_MODEL.switchMs + 1, true);
    expect(root.position.y).toBeCloseTo(VIEW_MODEL.rest[1], 1);

    view.dispose();
    expect(camera.children).toHaveLength(0);
  });

  it('flashes at the muzzle only briefly after a shot', () => {
    const camera = new THREE.PerspectiveCamera();
    const view = createViewModel(camera);
    const [root] = camera.children;
    const flash = root.children.find((child) => child instanceof THREE.Mesh)!;
    view.update(0.016, 0, 1000, true);
    expect(flash.visible).toBe(false);
    view.fire(1000);
    view.update(0.016, 0, 1010, true);
    expect(flash.visible).toBe(true);
    expect(flash.position.z).toBeCloseTo(VIEW_MODELS.blaster.muzzle[2]);
    view.update(0.016, 0, 1000 + VIEW_MODEL.flashMs + 1, true);
    expect(flash.visible).toBe(false);
    view.dispose();
  });

  it('dips the gun through a reload and brings it back', () => {
    const camera = new THREE.PerspectiveCamera();
    const view = createViewModel(camera);
    const [root] = camera.children;
    view.reload(1000, 1000);
    view.update(0.016, 0, 1500, true);
    expect(root.position.y).toBeLessThan(VIEW_MODEL.rest[1] - VIEW_MODEL.reloadDrop * 0.9);
    expect(root.rotation.z).toBeCloseTo(VIEW_MODEL.reloadRoll);
    view.update(0.016, 0, 2001, true);
    expect(root.rotation.z).toBe(0);
    view.dispose();
  });
});
