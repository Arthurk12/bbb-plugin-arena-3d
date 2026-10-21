import { IntlShape } from 'react-intl';
import { ArenaUser } from '../../commons/types';
import { ScoreRow } from '../../game/hud/types';

export interface ScoreboardProps {
  intl: IntlShape;
  rows: ScoreRow[];
  users: Record<string, ArenaUser>;
  currentUserId: string | null;
  fallbackName: string;
}
