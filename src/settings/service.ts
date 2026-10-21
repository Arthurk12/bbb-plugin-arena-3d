import { ArenaSettings } from './types';
import { DEFAULT_SETTINGS, MAX_PLAYERS_RANGE, RENDER_SCALE_RANGE } from './constants';

type RawSettings = Record<string, unknown> | undefined | null;

interface Range {
  min: number;
  max: number;
}

const readBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const readNumberInRange = (value: unknown, fallback: number, range: Range): number => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return fallback;
  return Math.min(range.max, Math.max(range.min, parsed));
};

const readIntInRange = (value: unknown, fallback: number, range: Range): number => (
  Math.round(readNumberInRange(value, fallback, range))
);

/**
 * Merges the raw plugin settings over the defaults, discarding values of the wrong type.
 * The manifest's `defaultValue`s are not applied by the core for optional settings,
 * so this is where the defaults actually take effect.
 */
export const parseSettings = (raw: RawSettings): ArenaSettings => ({
  debug: readBoolean(raw?.debug, DEFAULT_SETTINGS.debug),
  maxPlayers: readIntInRange(raw?.maxPlayers, DEFAULT_SETTINGS.maxPlayers, MAX_PLAYERS_RANGE),
  renderScale: readNumberInRange(
    raw?.renderScale,
    DEFAULT_SETTINGS.renderScale,
    RENDER_SCALE_RANGE,
  ),
});
