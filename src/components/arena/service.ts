import { EngineContext } from '../../game/engine/types';
import { ArenaSessionState } from '../../session/types';
import { intlMessages } from '../main/messages';

/**
 * The game reads its context every frame; it is rebuilt only when the session state changes
 * (the store hands out a new object on every change).
 */
export const createEngineContextReader = (getState: () => ArenaSessionState) => {
  let source: ArenaSessionState | null = null;
  let context: EngineContext | null = null;
  return (): EngineContext => {
    const state = getState();
    if (state !== source || !context) {
      source = state;
      context = {
        currentUserId: state.currentUserId,
        users: state.users,
        fallbackName: state.intl.formatMessage(intlMessages.unknownPlayer),
        maxPlayers: state.maxPlayers,
        renderScale: state.renderScale,
      };
    }
    return context;
  };
};
