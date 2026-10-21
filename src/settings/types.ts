import { PluginApi } from 'bigbluebutton-html-plugin-sdk';
import * as React from 'react';

export interface ArenaSettings {
  debug: boolean;
  /** Players drawn at once, including yourself; the nearest ones win. */
  maxPlayers: number;
  /** Fraction of the screen resolution the game renders at (pixelated upscale). */
  renderScale: number;
}

export interface SettingsContextValue {
  settings: ArenaSettings;
  /** False until the settings subscription resolved (or failed). */
  ready: boolean;
}

export interface SettingsProviderProps {
  pluginApi: PluginApi;
  children: React.ReactNode;
}
