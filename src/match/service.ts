import { DataChannelEntryResponseType } from 'bigbluebutton-html-plugin-sdk';
import { HIDDEN_ARENA_STORAGE_KEY_PREFIX, MODERATOR_ROLE } from '../commons/constants';
import { ROUND_ID_LENGTH } from './constants';
import { MatchState, MatchStatePayload } from './types';

/** Reads the latest match entry; anything malformed counts as no match. */
export const parseMatchState = (
  entries: DataChannelEntryResponseType<MatchStatePayload>[] | undefined,
): MatchState | null => {
  const latest = entries?.[0];
  const payload = latest?.payloadJson;
  if (!latest || !payload || typeof payload.round !== 'string' || !payload.round) return null;
  return {
    entryId: latest.entryId,
    active: payload.active === true,
    round: payload.round,
  };
};

export const newRoundId = (): string => {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return random.slice(0, ROUND_ID_LENGTH);
};

export const isModeratorRole = (role: string | undefined): boolean => role === MODERATOR_ROLE;

export const hiddenArenaStorageKey = (matchEntryId: string): string => (
  `${HIDDEN_ARENA_STORAGE_KEY_PREFIX}${matchEntryId}`
);

export const readHiddenArena = (matchEntryId: string): boolean => {
  try {
    return window.localStorage.getItem(hiddenArenaStorageKey(matchEntryId)) === 'true';
  } catch {
    return false;
  }
};

export const writeHiddenArena = (matchEntryId: string, hidden: boolean): void => {
  try {
    const key = hiddenArenaStorageKey(matchEntryId);
    if (hidden) window.localStorage.setItem(key, 'true');
    else window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the choice then lasts
    // only for this page load, which is acceptable for a view preference.
  }
};
