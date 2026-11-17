import { Vec3 } from '../../commons/types';

export type SoundId =
  | 'blaster' | 'shotgun' | 'smg' | 'sniper' | 'hit' | 'headshot' | 'frag' | 'jump' | 'pad'
  | 'pain' | 'death' | 'pickup' | 'respawn' | 'empty' | 'reload' | 'ammo';

export interface ArenaAudio {
  /** Browsers only start audio from a user gesture. */
  resume: () => void;
  play: (sound: SoundId, volume?: number) => void;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
}

export interface Effects {
  tracer: (from: Vec3, to: Vec3, color: number, now: number) => void;
  spark: (at: Vec3, onPlayer: boolean, now: number) => void;
  update: (now: number) => void;
  dispose: () => void;
}
