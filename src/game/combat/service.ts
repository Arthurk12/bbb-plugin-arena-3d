import { MAX_HEALTH } from '../../net/constants';
import { PlayerPayload } from '../../net/types';
import { RESPAWN_DELAY_MS, SPAWN_PROTECTION_MS } from './constants';
import { CombatState, DamageOutcome } from './types';

export const createCombatState = (now: number): CombatState => ({
  health: MAX_HEALTH,
  alive: true,
  deaths: 0,
  lastKiller: '',
  killedBy: {},
  diedAt: -Infinity,
  spawnedAt: now,
});

/**
 * Applies damage from `sourceId` (our own id for falls, slime and the like). Dying records
 * the frag for the killer, which is how kills are counted.
 */
export const takeDamage = (
  state: CombatState,
  amount: number,
  sourceId: string,
  selfId: string,
  now: number,
): DamageOutcome => {
  const protectedFromOthers = sourceId !== selfId && now - state.spawnedAt < SPAWN_PROTECTION_MS;
  if (!state.alive || amount <= 0 || protectedFromOthers) {
    return { state, taken: 0, died: false };
  }
  const health = Math.max(0, state.health - Math.round(amount));
  const taken = state.health - health;
  if (health > 0) return { state: { ...state, health }, taken, died: false };
  const killedBy = sourceId === selfId
    ? state.killedBy
    : { ...state.killedBy, [sourceId]: (state.killedBy[sourceId] ?? 0) + 1 };
  return {
    state: {
      ...state,
      health: 0,
      alive: false,
      deaths: state.deaths + 1,
      lastKiller: sourceId,
      killedBy,
      diedAt: now,
    },
    taken,
    died: true,
  };
};

export const heal = (state: CombatState, amount: number): CombatState => (
  state.alive ? { ...state, health: Math.min(MAX_HEALTH, state.health + amount) } : state
);

export const canHeal = (state: CombatState): boolean => state.alive && state.health < MAX_HEALTH;

export const respawnDue = (state: CombatState, now: number): boolean => (
  !state.alive && now - state.diedAt >= RESPAWN_DELAY_MS
);

export const respawnInSeconds = (state: CombatState, now: number): number => (
  state.alive ? 0 : Math.max(0, Math.ceil((RESPAWN_DELAY_MS - (now - state.diedAt)) / 1000))
);

export const respawn = (state: CombatState, now: number): CombatState => ({
  ...state, health: MAX_HEALTH, alive: true, spawnedAt: now,
});

/** A new round: everyone starts from zero, alive. */
export const resetForRound = (now: number): CombatState => createCombatState(now);

/** After a reload in the same round, the score stored in our entry carries on. */
export const restoreScore = (state: CombatState, stored: PlayerPayload): CombatState => ({
  ...state,
  deaths: stored.dt,
  lastKiller: stored.lk,
  killedBy: { ...stored.kb },
});
