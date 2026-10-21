import { useEffect, useMemo } from 'react';
import { PluginApi, pluginLogger } from 'bigbluebutton-html-plugin-sdk';
import { LOG_CODES } from '../commons/constants';
import { toArenaUsers } from './service';
import { MeetingUsers } from './types';

/**
 * The users in the meeting: their ids (to hide players who left; data-channel entries outlive
 * them) and their names and colors (for name tags and the scoreboard).
 */
export const useMeetingUsers = (pluginApi: PluginApi): MeetingUsers => {
  const { data, loading, error } = pluginApi.useUsersBasicInfo!();

  useEffect(() => {
    if (!error) return;
    pluginLogger.error(
      { logCode: LOG_CODES.USERS_ERROR, extraInfo: { error: error.message } },
      `Failed to read the user list in ${pluginApi.pluginName}`,
    );
  }, [error]);

  const list = data?.user;
  return useMemo(() => {
    // Unknown is not empty: hiding everyone on a hiccup would be worse than showing a ghost.
    if (loading || error || !list) return { presentUserIds: null, users: {} };
    return {
      presentUserIds: new Set(list.map((user) => user.userId)),
      users: toArenaUsers(list),
    };
  }, [list, loading, error]);
};
