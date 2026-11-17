import { ArenaSettings } from './types';

export const DEFAULT_SETTINGS: ArenaSettings = {
  debug: false,
  maxPlayers: 16,
  renderScale: 0.75,
  relayUrl: '',
};

export const MAX_PLAYERS_RANGE = { min: 2, max: 64 };

export const RENDER_SCALE_RANGE = { min: 0.25, max: 1 };

export const MAX_RELAY_URL_LENGTH = 512;

/** Only WebSocket URLs make sense for the relay. */
export const RELAY_URL_PATTERN = /^wss?:\/\//i;
