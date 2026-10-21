export interface CombatState {
  health: number;
  alive: boolean;
  /** Deaths this round. */
  deaths: number;
  /** Who caused the last death (our own id for a suicide), or '' before any. */
  lastKiller: string;
  /** Frags we gave each killer this round. */
  killedBy: Record<string, number>;
  diedAt: number;
  spawnedAt: number;
}

export interface DamageOutcome {
  state: CombatState;
  /** Health actually lost. */
  taken: number;
  died: boolean;
}
