import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { PluginApi } from 'bigbluebutton-html-plugin-sdk';
import { IntlShape } from 'react-intl';
import { useMatchNotifications } from '../../src/components/main/hooks';
import { MatchState } from '../../src/match/types';

interface Props { match: MatchState | null; loaded: boolean }

const RUNNING: MatchState = { entryId: 'e1', active: true, round: 'r1' };

const setup = () => {
  const send = vi.fn();
  const pluginApi = { uiCommands: { notification: { send } } } as unknown as PluginApi;
  const intl = { formatMessage: ({ id }: { id: string }) => id } as unknown as IntlShape;
  const { rerender } = renderHook(
    (props: Props) => useMatchNotifications({ pluginApi, intl, ...props }),
    { initialProps: { match: null, loaded: false } as Props },
  );
  const messages = () => send.mock.calls.map(([notification]) => notification.message);
  return { rerender, messages };
};

describe('useMatchNotifications', () => {
  it('stays quiet for someone who joins while a match runs', () => {
    const { rerender, messages } = setup();
    rerender({ match: RUNNING, loaded: true });
    expect(messages()).toEqual([]);
  });

  it('announces a match that starts after the channel loaded', () => {
    const { rerender, messages } = setup();
    rerender({ match: null, loaded: true });
    rerender({ match: RUNNING, loaded: true });
    expect(messages()).toEqual(['notification.matchStarted']);
  });

  it('announces a new round', () => {
    const { rerender, messages } = setup();
    rerender({ match: RUNNING, loaded: true });
    rerender({ match: { ...RUNNING, round: 'r2' }, loaded: true });
    expect(messages()).toEqual(['notification.newRound']);
  });
});
