import { IntlShape } from 'react-intl';
import { ArenaUser } from '../commons/types';
import { GameNet } from '../net/types';
import { Store } from '../store/types';

export interface ArenaSessionState {
  intl: IntlShape;
  pluginName: string;
  currentUserId: string | null;
  users: Record<string, ArenaUser>;
  maxPlayers: number;
  renderScale: number;
}

/**
 * Everything the arena (rendered in a React root the client owns) gets from the always-mounted
 * plugin: meeting state through a store, game traffic through the net.
 */
export interface ArenaSession {
  state: Store<ArenaSessionState>;
  net: GameNet;
}
