import { HudState } from '../../game/hud/types';
import { ArenaSession } from '../../session/types';
import { Store } from '../../store/types';

export interface HudProps {
  hud: Store<HudState>;
  session: ArenaSession;
  onPlay: () => void;
}
