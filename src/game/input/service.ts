import { KEY_BINDINGS } from './constants';

const anyPressed = (pressed: Set<string>, codes: string[]) => (
  codes.some((code) => pressed.has(code))
);

const axis = (pressed: Set<string>, positive: string[], negative: string[]) => (
  (anyPressed(pressed, positive) ? 1 : 0) - (anyPressed(pressed, negative) ? 1 : 0)
);

/** Movement wished by the keys currently held. */
export const movementFromKeys = (pressed: Set<string>) => ({
  forward: axis(pressed, KEY_BINDINGS.forward, KEY_BINDINGS.back),
  strafe: axis(pressed, KEY_BINDINGS.right, KEY_BINDINGS.left),
  jump: anyPressed(pressed, KEY_BINDINGS.jump),
  walk: anyPressed(pressed, KEY_BINDINGS.walk),
  scoreboard: anyPressed(pressed, KEY_BINDINGS.scoreboard),
});

const GAME_KEYS = new Set(Object.values(KEY_BINDINGS).flat());

/** Keys the game owns while it has the pointer, so the page doesn't scroll or tab away. */
export const isGameKey = (code: string): boolean => GAME_KEYS.has(code);
