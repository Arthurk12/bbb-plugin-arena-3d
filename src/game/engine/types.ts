import { ArenaUser } from '../../commons/types';
import { ConnectionStatus } from '../../relay-client/types';
import { Store } from '../../store/types';
import { HudState } from '../hud/types';

/** What the game reads from the meeting each frame. */
export interface EngineContext {
  currentUserId: string | null;
  users: Record<string, ArenaUser>;
  /** Name shown for someone not (or no longer) in the user list. */
  fallbackName: string;
  maxPlayers: number;
  renderScale: number;
  /** Round of the running match (a room on the relay); null without a match. */
  round: string | null;
  /** WebSocket URL of the relay, without the session token. */
  relayUrl: string;
  /** BBB session token, checked by nginx before the relay sees us; null if unavailable. */
  sessionToken: string | null;
}

export interface EngineOptions {
  container: HTMLElement;
  hud: Store<HudState>;
  getContext: () => EngineContext;
  onWebglError: (error: unknown) => void;
  /** Called whenever the relay connection changes state. */
  onConnectionStatus: (status: ConnectionStatus) => void;
}

export interface ArenaEngine {
  /** Locks the pointer and starts audio; call from a click. */
  requestPlay: () => void;
  dispose: () => void;
}
