import { ArenaUser } from '../../commons/types';
import { GameNet } from '../../net/types';
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
}

export interface EngineOptions {
  container: HTMLElement;
  net: GameNet;
  hud: Store<HudState>;
  getContext: () => EngineContext;
  onWebglError: (error: unknown) => void;
}

export interface ArenaEngine {
  /** Locks the pointer and starts audio; call from a click. */
  requestPlay: () => void;
  dispose: () => void;
}
