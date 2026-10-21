export interface InputSnapshot {
  forward: number;
  strafe: number;
  jump: boolean;
  walk: boolean;
  firing: boolean;
  scoreboard: boolean;
  /** Mouse movement since the last read, pixels. */
  lookX: number;
  lookY: number;
  /** Weapon slot picked since the last read, or null. */
  weaponSlot: number | null;
  /** Weapons to cycle by since the last read (wheel, Q). */
  weaponStep: number;
  toggleMute: boolean;
  /** Whether the pointer is locked to the game. */
  locked: boolean;
}

export interface InputController {
  /** Returns the input since the last read and clears one-shot events. */
  read: () => InputSnapshot;
  requestLock: () => void;
  dispose: () => void;
}
