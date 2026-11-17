import { PluginApi } from 'bigbluebutton-html-plugin-sdk';
import * as React from 'react';

export interface ArenaSettings {
  debug: boolean;
  /** Players drawn at once, including yourself; the nearest ones win. */
  maxPlayers: number;
  /** Fraction of the screen resolution the game renders at (pixelated upscale). */
  renderScale: number;
  /** Relay WebSocket URL; empty means wss://<the BBB server serving the plugin>/arena-relay. */
  relayUrl: string;
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
