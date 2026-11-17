import { IntlShape } from 'react-intl';
import { ArenaUser } from '../commons/types';
import { Store } from '../store/types';

export interface ArenaSessionState {
  intl: IntlShape;
  pluginName: string;
  currentUserId: string | null;
  users: Record<string, ArenaUser>;
  maxPlayers: number;
  renderScale: number;
  /** Round of the running match (a room on the relay); null without a match. */
  round: string | null;
  /** WebSocket URL of the relay, without the session token. */
  relayUrl: string;
  /** BBB session token, checked by nginx before the relay sees us; null if unavailable. */
  sessionToken: string | null;
}

/**
 * Everything the arena (rendered in a React root the client owns) gets from the always-mounted
 * plugin, through a store: the game talks to the relay itself.
 */
export interface ArenaSession {
  state: Store<ArenaSessionState>;
}
