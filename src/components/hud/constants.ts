import { HitMarker } from '../../game/hud/types';

export const LOW_HEALTH = 30;

export const HUD_COLORS = {
  text: '#fff4d6',
  accent: '#ffcc33',
  danger: '#ff3b3b',
  panel: 'rgba(10, 6, 20, 0.6)',
  overlay: 'rgba(10, 6, 20, 0.78)',
  headshot: '#ff3b3b',
  hit: '#ffffff',
  limb: '#bdbdbd',
};

export const HUD_FONT = '"Press Start 2P", "Courier New", monospace';

/** Hit marker by what was hit: color and size, pixels. */
export const HIT_MARKER: Record<HitMarker, { color: string; size: number }> = {
  head: { color: HUD_COLORS.headshot, size: 34 },
  body: { color: HUD_COLORS.hit, size: 28 },
  limb: { color: HUD_COLORS.limb, size: 20 },
};

/** Shown next to the weapon in the kill feed when the frag was a headshot. */
export const HEADSHOT_ICON = '◎';

/** Radius of the round view through a scope. */
export const SCOPE_RADIUS = '38vmin';
