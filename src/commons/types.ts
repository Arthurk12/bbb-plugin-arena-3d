export type Vec3 = [number, number, number];

export interface LatestEntry<T> {
  entryId: string;
  updatedAt: string;
  value: T;
}

export interface LatestEntries<T> {
  byUser: Record<string, LatestEntry<T>>;
  /** Older entries of each user, safe for their owner to delete. */
  staleEntryIdsByUser: Record<string, string[]>;
}

/** A meeting participant as the arena shows them. */
export interface ArenaUser {
  name: string;
  /** BBB user color (`#rrggbb`), used for name tags and the scoreboard. */
  color: string;
}
