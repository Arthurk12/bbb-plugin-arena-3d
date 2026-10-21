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
      debug: true, maxPlayers: 8, renderScale: 1,
    });
    expect(parseSettings({ maxPlayers: 1000, renderScale: 0.01 })).toMatchObject({
      maxPlayers: 64, renderScale: 0.25,
    });
  });
});
