import { ArenaUser } from '../../commons/types';

export const nameOf = (
  userId: string,
  users: Record<string, ArenaUser>,
  fallback: string,
): string => users[userId]?.name ?? fallback;
