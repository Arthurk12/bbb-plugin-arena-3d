import * as React from 'react';
import { useEffect, useRef } from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  AppsGalleryEntry,
  GenericContentMainArea,
  MediaAreaOption,
  NotificationTypeUiCommand,
} from 'bigbluebutton-html-plugin-sdk';
import { DATA_TEST } from '../../commons/constants';
import { ARENA_ICON } from '../../commons/icons';
import ArenaHost from '../arena-host/component';
import { intlMessages } from './messages';
import {
  AppsGalleryEntryOptions,
  ArenaMainAreaOptions,
  MatchNotificationsOptions,
  MediaAreaToggleOptions,
} from './types';

export const useAppsGalleryEntry = ({
  pluginApi, intl, isModerator, matchActive, onOpenAdmin, onShowArena,
}: AppsGalleryEntryOptions) => {
  useEffect(() => {
    // Moderators run matches; everyone else only gets an entry while one runs.
    if (!isModerator && !matchActive) return undefined;
    pluginApi.setAppsGalleryItems([
      new AppsGalleryEntry({
        name: intl.formatMessage(intlMessages.appName),
        icon: { svgContent: ARENA_ICON },
        dataTest: DATA_TEST.APPS_GALLERY_ENTRY,
        onClick: isModerator ? onOpenAdmin : onShowArena,
      }),
    ]);
    return () => { pluginApi.setAppsGalleryItems([]); };
  }, [intl, isModerator, matchActive, onOpenAdmin, onShowArena]);
};

export const useMediaAreaToggle = ({
  pluginApi, intl, matchActive, hidden, onToggle,
}: MediaAreaToggleOptions) => {
  useEffect(() => {
    if (!matchActive) return undefined;
    const label = intl.formatMessage(
      hidden ? intlMessages.showArena : intlMessages.showPresentation,
    );
    pluginApi.setMediaAreaItems([
      new MediaAreaOption({
        label,
        tooltip: label,
        icon: { svgContent: ARENA_ICON },
        dataTest: DATA_TEST.MEDIA_AREA_TOGGLE,
        allowed: true,
        onClick: onToggle,
      }),
    ]);
    return () => { pluginApi.setMediaAreaItems([]); };
  }, [intl, matchActive, hidden, onToggle]);
};

/** While shown, the arena replaces the presentation in the media area. */
export const useArenaMainArea = ({ pluginApi, showArena, session }: ArenaMainAreaOptions) => {
  useEffect(() => {
    if (!showArena) return undefined;
    pluginApi.setGenericContentItems([
      new GenericContentMainArea({
        dataTest: DATA_TEST.MAIN_AREA_ARENA,
        contentFunction: (element: HTMLElement) => {
          const root = ReactDOM.createRoot(element);
          root.render(<ArenaHost session={session} />);
          return root;
        },
      }),
    ]);
    return () => { pluginApi.setGenericContentItems([]); };
  }, [showArena, session]);
};

/** Tells everyone when a match starts or a new round begins (not on the first read). */
export const useMatchNotifications = ({ pluginApi, intl, match }: MatchNotificationsOptions) => {
  const previous = useRef<typeof match | undefined>(undefined);
  useEffect(() => {
    const before = previous.current;
    previous.current = match;
    if (before === undefined || !match?.active) return;
    let message = null;
    if (!before?.active || before.entryId !== match.entryId) message = intlMessages.matchStarted;
    else if (before.round !== match.round) message = intlMessages.newRound;
    if (!message) return;
    pluginApi.uiCommands?.notification.send({
      message: intl.formatMessage(message),
      icon: { svgContent: ARENA_ICON },
      type: NotificationTypeUiCommand.INFO,
    });
  }, [match?.entryId, match?.active, match?.round]);
};
