import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { DataChannelTypes, PluginApi, pluginLogger } from 'bigbluebutton-html-plugin-sdk';
import { DATA_CHANNELS, LOG_CODES } from '../commons/constants';
import {
  isModeratorRole, newRoundId, parseMatchState, readHiddenArena, writeHiddenArena,
} from './service';
import { CurrentUserRole, MatchStatePayload, UseMatchStateResult } from './types';

/** Whether the current user may run matches: on loading or error, they may not. */
export const useCurrentUserRole = (pluginApi: PluginApi): CurrentUserRole => {
  const response = pluginApi.useCurrentUser!();
  const error = response?.error;

  useEffect(() => {
    if (!error) return;
    pluginLogger.error(
      { logCode: LOG_CODES.CURRENT_USER_ERROR, extraInfo: { error: error.message } },
      `Failed to read the current user in ${pluginApi.pluginName}`,
    );
  }, [error]);

  return {
    isModerator: !response?.loading && !error && isModeratorRole(response?.data?.role),
    userId: response?.data?.userId ?? null,
  };
};

export const useMatchState = (pluginApi: PluginApi): UseMatchStateResult => {
  const {
    data: response, pushEntry, replaceEntry, deleteEntry,
  } = pluginApi.useDataChannel!<MatchStatePayload>(
    DATA_CHANNELS.MATCH,
    DataChannelTypes.LATEST_ITEM,
  );
  const { data: entries, loading, error } = response;

  useEffect(() => {
    if (!error) return;
    pluginLogger.error(
      { logCode: LOG_CODES.MATCH_ERROR, extraInfo: { error: error.message } },
      `Failed to read the match state of ${pluginApi.pluginName}`,
    );
  }, [error]);

  // The match decides whether the media area is taken over, so on error stay quiet
  // (no match) instead of guessing.
  const match = useMemo(
    () => (loading || error ? null : parseMatchState(entries)),
    [entries, loading, error],
  );

  const logChange = (action: string, round: string) => pluginLogger.info(
    { logCode: LOG_CODES.MATCH_CHANGED, extraInfo: { action, round } },
    `Match ${action} in ${pluginApi.pluginName}`,
  );

  // A new match is a new entry, so everyone's "hide the arena" choice starts over. The stopped
  // match's entry is deleted first, so the channel never holds more than one. Until the channel
  // loads (and the SDK hands over the push function) we cannot tell whether a match runs.
  const start = useCallback(() => {
    if (!pushEntry || loading || error || match?.active) return;
    if (match) deleteEntry([match.entryId]);
    const round = newRoundId();
    pushEntry({ active: true, round });
    logChange('started', round);
  }, [pushEntry, deleteEntry, loading, error, match?.entryId, match?.active]);

  // A new round keeps the entry (and the hide choices) and zeroes every score.
  const newRound = useCallback(() => {
    if (!match?.active) return;
    const round = newRoundId();
    replaceEntry(match.entryId, { active: true, round });
    logChange('new-round', round);
  }, [replaceEntry, match?.entryId, match?.active]);

  // Stopping replaces the entry, so it stays the latest and the channel does not grow.
  const stop = useCallback(() => {
    if (!match?.active) return;
    replaceEntry(match.entryId, { active: false, round: match.round });
    logChange('stopped', match.round);
  }, [replaceEntry, match?.entryId, match?.active, match?.round]);

  return {
    match, loaded: !loading && !error, start, newRound, stop,
  };
};

/** Per-viewer "hide the arena" choice, scoped to one match. */
export const useHiddenArena = (matchEntryId: string | undefined) => {
  const [hidden, setHiddenState] = useState(false);

  useEffect(() => {
    setHiddenState(matchEntryId ? readHiddenArena(matchEntryId) : false);
  }, [matchEntryId]);

  const setHidden = useCallback((value: boolean) => {
    if (matchEntryId) writeHiddenArena(matchEntryId, value);
    setHiddenState(value);
  }, [matchEntryId]);

  return [hidden, setHidden] as const;
};
