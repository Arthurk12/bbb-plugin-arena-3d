import { useContext } from 'react';
import { SettingsContext } from './context';
import { SettingsContextValue } from './types';

const useSettingsContext = (hookName: string): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error(`${hookName} must be used within a SettingsProvider`);
  return context;
};

export const useSettingsReady = () => useSettingsContext('useSettingsReady').ready;

export const useDebug = () => useSettingsContext('useDebug').settings.debug;

export const useMaxPlayers = () => useSettingsContext('useMaxPlayers').settings.maxPlayers;

export const useRenderScale = () => useSettingsContext('useRenderScale').settings.renderScale;
