import { IntlShape } from 'react-intl';
import { MatchControls } from '../../match/types';

export interface AdminModalProps {
  intl: IntlShape;
  isOpen: boolean;
  onClose: () => void;
  matchActive: boolean;
  /** Whether this moderator hid the arena. */
  hidden: boolean;
  controls: MatchControls;
  onShowArena: () => void;
}
