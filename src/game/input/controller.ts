import { movementFromKeys, isGameKey } from './service';
import { KEY_BINDINGS, PRIMARY_BUTTON, WEAPON_KEYS } from './constants';
import { InputController } from './types';

/**
 * Keyboard and mouse, only while the pointer is locked to the game canvas: typing in the chat
 * never moves the player.
 */
export const createInputController = (canvas: HTMLCanvasElement): InputController => {
  const pressed = new Set<string>();
  let firing = false;
  let lookX = 0;
  let lookY = 0;
  let weaponSlot: number | null = null;
  let weaponStep = 0;
  let toggleMute = false;

  const isLocked = () => document.pointerLockElement === canvas;

  const onKeyDown = (event: KeyboardEvent) => {
    if (!isLocked()) return;
    if (isGameKey(event.code) || WEAPON_KEYS.includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    pressed.add(event.code);
    const slot = WEAPON_KEYS.indexOf(event.code);
    if (slot >= 0) weaponSlot = slot;
    if (KEY_BINDINGS.nextWeapon.includes(event.code)) weaponStep += 1;
    if (KEY_BINDINGS.mute.includes(event.code)) toggleMute = true;
  };
  const onKeyUp = (event: KeyboardEvent) => { pressed.delete(event.code); };
  const onMouseMove = (event: MouseEvent) => {
    if (!isLocked()) return;
    lookX += event.movementX;
    lookY += event.movementY;
  };
  const onMouseDown = (event: MouseEvent) => {
    if (event.button === PRIMARY_BUTTON && isLocked()) firing = true;
  };
  const onMouseUp = (event: MouseEvent) => {
    if (event.button === PRIMARY_BUTTON) firing = false;
  };
  const onWheel = (event: WheelEvent) => {
    if (!isLocked()) return;
    event.preventDefault();
    weaponStep += Math.sign(event.deltaY);
  };
  const onLockChange = () => {
    if (isLocked()) return;
    pressed.clear();
    firing = false;
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('pointerlockchange', onLockChange);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    read: () => {
      const snapshot = {
        ...movementFromKeys(pressed),
        firing,
        lookX,
        lookY,
        weaponSlot,
        weaponStep,
        toggleMute,
        locked: isLocked(),
      };
      lookX = 0;
      lookY = 0;
      weaponSlot = null;
      weaponStep = 0;
      toggleMute = false;
      return snapshot;
    },
    requestLock: () => {
      if (isLocked()) return;
      try {
        const request = canvas.requestPointerLock() as unknown;
        if (request instanceof Promise) request.catch(() => {});
      } catch {
        // Some browsers refuse right after an exit (cool-down); the next click retries.
      }
    },
    dispose: () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onLockChange);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('wheel', onWheel);
      if (isLocked()) document.exitPointerLock();
    },
  };
};
