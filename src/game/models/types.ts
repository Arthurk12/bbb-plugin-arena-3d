export type Triple = [number, number, number];

/** One box of a model, in the model's frame (meters): its size, center and color. */
export interface ModelPart {
  size: Triple;
  at: Triple;
  color: number;
  /** Turn around x before moving into place, radians (raked grips, dropped stocks). */
  tilt?: number;
  /** Drawn at full color on every face (lenses, energy cells). */
  glow?: boolean;
}

export interface ShadedBoxOptions {
  /** Stored per vertex: 1 lets a material recolor the box, 0 keeps its color. */
  tint?: number;
  /** Turn around x before moving into place, radians. */
  tilt?: number;
  /** Whether each face gets its own brightness; false draws every face at full color. */
  shaded?: boolean;
}
