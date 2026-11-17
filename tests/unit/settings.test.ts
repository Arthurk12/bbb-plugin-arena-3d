import { describe, expect, it } from 'vitest';
import { parseSettings } from '../../src/settings/service';
import { DEFAULT_SETTINGS } from '../../src/settings/constants';

describe('parseSettings', () => {
  it('falls back to the defaults', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ debug: 'yes', maxPlayers: 'many' })).toEqual(DEFAULT_SETTINGS);
  });

  it('reads strings and clamps to the allowed ranges', () => {
    expect(parseSettings({ debug: 'true', maxPlayers: '8', renderScale: 5 })).toEqual({
      debug: true, maxPlayers: 8, renderScale: 1, relayUrl: '',
    });
    expect(parseSettings({ maxPlayers: 1000, renderScale: 0.01 })).toMatchObject({
      maxPlayers: 64, renderScale: 0.25,
    });
  });

  it('keeps a WebSocket relay URL and drops anything else', () => {
    expect(parseSettings({ relayUrl: 'wss://relay.example.com/arena' }).relayUrl)
      .toBe('wss://relay.example.com/arena');
    expect(parseSettings({ relayUrl: 'https://x' }).relayUrl).toBe('');
    expect(parseSettings({ relayUrl: 42 }).relayUrl).toBe('');
    expect(parseSettings({ relayUrl: '   ' }).relayUrl).toBe('');
  });
});
