import * as React from 'react';
import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { BbbPluginSdk, PluginApi } from 'bigbluebutton-html-plugin-sdk';
import { useGetInternationalization } from '../../commons/hooks';
import { useCurrentUserRole, useHiddenArena, useMatchState } from '../../match/hooks';
import { createGameNet } from '../../net/net';
import { usePlayersTransport } from '../../net/hooks';
import { SettingsProvider } from '../../settings/context';
import { useMaxPlayers, useRenderScale, useSettingsReady } from '../../settings/hooks';
import { createStore } from '../../store/service';
import { ArenaSession, ArenaSessionState } from '../../session/types';
import { useMeetingUsers } from '../../users/hooks';
import AdminModal from '../admin/component';
import {
  useAppsGalleryEntry, useArenaMainArea, useMatchNotifications, useMediaAreaToggle,
} from './hooks';
import { ArenaPluginProps, MainContentProps } from './types';

/** Wires the match and the players to the client's UI: gallery entry, media area, admin modal. */
function MainContent({ pluginApi, intl }: MainContentProps) {
  const { isModerator, userId: currentUserId } = useCurrentUserRole(pluginApi);
  const {
    match, start, newRound, stop,
  } = useMatchState(pluginApi);
  const matchActive = !!match?.active;
  const [hidden, setHidden] = useHiddenArena(match?.entryId);
  const settingsReady = useSettingsReady();
  const maxPlayers = useMaxPlayers();
  const renderScale = useRenderScale();
  const { presentUserIds, users } = useMeetingUsers(pluginApi);

  const net = useMemo(createGameNet, []);
  const { resetPlayers } = usePlayersTransport({
    pluginApi,
    net,
    currentUserId,
    round: matchActive ? match!.round : null,
    presentUserIds,
  });

  const session = useMemo<ArenaSession>(() => ({
    state: createStore<ArenaSessionState>({
      intl,
      pluginName: pluginApi.pluginName ?? '',
      currentUserId,
      users,
      maxPlayers,
      renderScale,
    }),
    net,
  }), []);

  useEffect(() => {
    session.state.setState({
      intl, currentUserId, users, maxPlayers, renderScale,
    });
  }, [intl, currentUserId, users, maxPlayers, renderScale]);

  // Wait for the settings so the first frame already renders at the configured scale.
  const showArena = matchActive && !hidden && settingsReady;
  useArenaMainArea({ pluginApi, showArena, session });
  useMatchNotifications({ pluginApi, intl, match });

  const [adminOpen, setAdminOpen] = useState(false);
  const openAdmin = useCallback(() => setAdminOpen(true), []);
  const closeAdmin = useCallback(() => setAdminOpen(false), []);
  const showArenaAgain = useCallback(() => setHidden(false), [setHidden]);
  const toggleHidden = useCallback(() => setHidden(!hidden), [setHidden, hidden]);
  const stopMatch = useCallback(() => {
    stop();
    resetPlayers();
  }, [stop, resetPlayers]);

  useAppsGalleryEntry({
    pluginApi, intl, isModerator, matchActive, onOpenAdmin: openAdmin, onShowArena: showArenaAgain,
  });
  useMediaAreaToggle({
    pluginApi, intl, matchActive, hidden, onToggle: toggleHidden,
  });

  if (!isModerator) return null;

  return (
    <AdminModal
      intl={intl}
      isOpen={adminOpen}
      onClose={closeAdmin}
      matchActive={matchActive}
      hidden={hidden}
      controls={{ start, newRound, stop: stopMatch }}
      onShowArena={showArenaAgain}
    />
  );
}

function ArenaPlugin({ pluginUuid: uuid }: ArenaPluginProps) {
  BbbPluginSdk.initialize(uuid);
  const pluginApi: PluginApi = BbbPluginSdk.getPluginApi(uuid);
  const shouldUnmountPlugin = pluginApi.useShouldUnmountPlugin!();
  const { intl } = useGetInternationalization(pluginApi);

  if (shouldUnmountPlugin || !intl) return null;

  return (
    <SettingsProvider pluginApi={pluginApi}>
      <MainContent pluginApi={pluginApi} intl={intl} />
    </SettingsProvider>
  );
}

export default ArenaPlugin;
