import { ArenaUser } from '../commons/types';

export interface MeetingUsers {
  /** Ids of users in the meeting, or null while unknown. */
  presentUserIds: Set<string> | null;
  users: Record<string, ArenaUser>;
}
