import {
  describe, expect, it, vi,
} from 'vitest';
import { renderHook } from '@testing-library/react';
import { PluginApi } from 'bigbluebutton-html-plugin-sdk';
import { useMatchState } from '../../src/match/hooks';

vi.mock('bigbluebutton-html-plugin-sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('bigbluebutton-html-plugin-sdk')>()),
  pluginLogger: { info: vi.fn(), error: vi.fn() },
}));

const setup = (payloadJson: unknown, { loading = false } = {}) => {
  const pushEntry = vi.fn();
  const replaceEntry = vi.fn();
  const deleteEntry = vi.fn();
  const pluginApi = {
    pluginName: 'test',
    useDataChannel: () => ({
      data: { data: payloadJson ? [{ entryId: 'e1', payloadJson }] : [], loading },
      pushEntry,
      replaceEntry,
      deleteEntry,
    }),
  } as unknown as PluginApi;
  const { result } = renderHook(() => useMatchState(pluginApi));
  return {
    controls: result.current, pushEntry, replaceEntry, deleteEntry,
  };
};

describe('useMatchState', () => {
  it('ignores Start while a match runs', () => {
    const { controls, pushEntry, deleteEntry } = setup({ active: true, round: 'r1' });
    controls.start();
    expect(pushEntry).not.toHaveBeenCalled();
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it('ignores Start until the channel loaded', () => {
    const { controls, pushEntry } = setup(null, { loading: true });
    controls.start();
    expect(pushEntry).not.toHaveBeenCalled();
  });

  it('starts the first match with a push', () => {
    const { controls, pushEntry, deleteEntry } = setup(null);
    controls.start();
    expect(deleteEntry).not.toHaveBeenCalled();
    expect(pushEntry).toHaveBeenCalledWith({ active: true, round: expect.any(String) });
  });

  it('replaces a stopped match entry with a new one', () => {
    const { controls, pushEntry, deleteEntry } = setup({ active: false, round: 'r1' });
    controls.start();
    expect(deleteEntry).toHaveBeenCalledWith(['e1']);
    expect(pushEntry).toHaveBeenCalledWith({ active: true, round: expect.any(String) });
  });

  it('stops by replacing the entry, without a push', () => {
    const { controls, pushEntry, replaceEntry } = setup({ active: true, round: 'r1' });
    controls.stop();
    expect(replaceEntry).toHaveBeenCalledWith('e1', { active: false, round: 'r1' });
    expect(pushEntry).not.toHaveBeenCalled();
  });

  it('ignores Stop when no match runs', () => {
    const { controls, replaceEntry } = setup({ active: false, round: 'r1' });
    controls.stop();
    expect(replaceEntry).not.toHaveBeenCalled();
  });
});
