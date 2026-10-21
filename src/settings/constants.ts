import { ArenaSettings } from './types';

export const DEFAULT_SETTINGS: ArenaSettings = {
  debug: false,
  maxPlayers: 16,
  renderScale: 0.75,
};

export const MAX_PLAYERS_RANGE = { min: 2, max: 64 };

export const RENDER_SCALE_RANGE = { min: 0.25, max: 1 };
