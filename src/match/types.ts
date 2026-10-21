/** Payload of the `match` data-channel entry; only moderators write it. */
export interface MatchStatePayload {
  active: boolean;
  /** Scores belong to a round: a new round starts everyone from zero. */
  round: string;
}

export interface MatchState extends MatchStatePayload {
  /** Data-channel entry id; a new match is a new entry, a new round replaces it. */
  entryId: string;
}

export interface CurrentUserRole {
  isModerator: boolean;
  userId: string | null;
}

export interface MatchControls {
  start: () => void;
  newRound: () => void;
  stop: () => void;
}

export interface UseMatchStateResult extends MatchControls {
  match: MatchState | null;
}
