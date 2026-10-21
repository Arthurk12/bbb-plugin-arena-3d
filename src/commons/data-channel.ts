import { DataChannelEntryResponseType } from 'bigbluebutton-html-plugin-sdk';
import { LatestEntries } from './types';

const entryTime = (entry: DataChannelEntryResponseType<unknown>) => (
  Date.parse(entry.updatedAt || entry.createdAt)
);

/**
 * For channels holding one entry per user: keeps each creator's most recently updated valid
 * entry. Identity always comes from `createdBy`, never from the payload. Older entries of the
 * same creator (left by racing first writes) are listed as stale so their owner can delete them.
 */
export const latestEntryPerCreator = <P, T>(
  entries: DataChannelEntryResponseType<P>[] | undefined,
  sanitize: (payload: unknown) => T | null,
): LatestEntries<T> => {
  const result: LatestEntries<T> = { byUser: {}, staleEntryIdsByUser: {} };
  [...(entries ?? [])]
    .sort((a, b) => entryTime(b) - entryTime(a))
    .forEach((entry) => {
      const userId = entry.createdBy;
      const value = sanitize(entry.payloadJson);
      if (!userId || value === null) return;
      if (!result.byUser[userId]) {
        result.byUser[userId] = { entryId: entry.entryId, updatedAt: entry.updatedAt, value };
      } else {
        (result.staleEntryIdsByUser[userId] ??= []).push(entry.entryId);
      }
    });
  return result;
};
