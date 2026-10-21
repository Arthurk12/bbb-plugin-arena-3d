import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import {
  DataChannelTypes, RESET_DATA_CHANNEL, pluginLogger,
} from 'bigbluebutton-html-plugin-sdk';
import { DATA_CHANNELS, LOG_CODES } from '../commons/constants';
import { latestEntryPerCreator } from '../commons/data-channel';
import { sanitizePlayerPayload } from './service';
import { PlayerPayload, PlayersTransport, PlayersTransportOptions } from './types';

/**
 * Players over the `players` data channel: one entry per user, replaced on every send
 * (throttled by the net). Feeds remote entries into the net and sends the local one.
 */
export const usePlayersTransport = ({
  pluginApi, net, currentUserId, round, presentUserIds,
}: PlayersTransportOptions): PlayersTransport => {
  const {
    data: response, pushEntry, replaceEntry, deleteEntry,
  } = pluginApi.useDataChannel!<PlayerPayload>(
    DATA_CHANNELS.PLAYERS,
    DataChannelTypes.ALL_ITEMS,
  );
  const { data: entries, loading, error } = response;

  useEffect(() => {
    if (!error) return;
    pluginLogger.error(
      { logCode: LOG_CODES.PLAYERS_ERROR, extraInfo: { error: error.message } },
      `Failed to read players in ${pluginApi.pluginName}`,
    );
  }, [error]);

  useEffect(() => { net.setLocalUserId(currentUserId); }, [net, currentUserId]);
  useEffect(() => { net.setRound(round); }, [net, round]);

  const latest = useMemo(
    () => latestEntryPerCreator(error ? [] : entries, sanitizePlayerPayload),
    [entries, error],
  );

  // Our own entry: replaced once it exists; until then a single push is in flight.
  const ownEntry = currentUserId ? latest.byUser[currentUserId] : undefined;
  const ownEntryIdRef = useRef<string | null>(null);
  const pushPendingRef = useRef(false);
  ownEntryIdRef.current = ownEntry?.entryId ?? null;
  if (ownEntry) pushPendingRef.current = false;

  const staleOwn = currentUserId ? latest.staleEntryIdsByUser[currentUserId] : undefined;
  useEffect(() => {
    if (staleOwn?.length) deleteEntry(staleOwn);
  }, [staleOwn?.join(',')]);

  // A reload picks the score up where the stored entry left it.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (loading || restoredRef.current || !currentUserId) return;
    restoredRef.current = true;
    if (ownEntry) net.restoreOwn(ownEntry.value);
  }, [loading, currentUserId]);

  const sendRef = useRef({ pushEntry, replaceEntry });
  sendRef.current = { pushEntry, replaceEntry };

  useEffect(() => {
    // Until the channel loaded we cannot tell a first send from an update.
    if (!round || !currentUserId || loading) return undefined;
    net.attachSender((payload) => {
      if (ownEntryIdRef.current) {
        sendRef.current.replaceEntry(ownEntryIdRef.current, payload);
      } else if (!pushPendingRef.current) {
        pushPendingRef.current = true;
        sendRef.current.pushEntry(payload);
      }
    });
    return () => net.attachSender(null);
  }, [net, round, currentUserId, loading]);

  // Feed changed entries into the net, and drop users who left the meeting.
  const lastSeenRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const now = performance.now();
    const keep = new Set<string>();
    Object.entries(latest.byUser).forEach(([userId, entry]) => {
      if (userId === currentUserId) return;
      if (presentUserIds && !presentUserIds.has(userId)) return;
      keep.add(userId);
      if (lastSeenRef.current[userId] === entry.updatedAt) return;
      lastSeenRef.current[userId] = entry.updatedAt;
      net.ingest(userId, entry.value, now);
    });
    Object.keys(lastSeenRef.current).forEach((userId) => {
      if (!keep.has(userId)) delete lastSeenRef.current[userId];
    });
    net.retainUsers(keep);
  }, [latest, currentUserId, presentUserIds, net]);

  const resetPlayers = useCallback(() => {
    deleteEntry([RESET_DATA_CHANNEL]);
  }, [deleteEntry]);

  return { resetPlayers };
};
