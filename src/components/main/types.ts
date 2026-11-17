import { PluginApi } from 'bigbluebutton-html-plugin-sdk';
import { IntlShape } from 'react-intl';
import { MatchState } from '../../match/types';
import { ArenaSession } from '../../session/types';

export interface ArenaPluginProps {
  pluginUuid: string;
  pluginName: string;
  /** URL of this plugin's script: the relay lives on the same BBB server. */
  scriptSrc: string | null;
}

export interface MainContentProps {
  pluginApi: PluginApi;
  intl: IntlShape;
  scriptSrc: string | null;
}

export interface AppsGalleryEntryOptions {
  pluginApi: PluginApi;
  intl: IntlShape;
  isModerator: boolean;
  matchActive: boolean;
  onOpenAdmin: () => void;
  onShowArena: () => void;
}

export interface MediaAreaToggleOptions {
  pluginApi: PluginApi;
  intl: IntlShape;
  matchActive: boolean;
  hidden: boolean;
  onToggle: () => void;
}

export interface ArenaMainAreaOptions {
  pluginApi: PluginApi;
  showArena: boolean;
  session: ArenaSession;
}

export interface MatchNotificationsOptions {
  pluginApi: PluginApi;
  intl: IntlShape;
  match: MatchState | null;
}
