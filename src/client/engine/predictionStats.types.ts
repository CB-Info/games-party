import type { Point } from "../../shared/cursor/collision";

/**
 * The contract of the development readout (docs/architecture.md, §6.5): what the renderer feeds it
 * at each frame, and what the HUD reads back from it. The collector itself is in
 * `predictionStats.ts`; the renderer and the HUD only need these shapes.
 */

export interface FramePoint {
  at: number;
  /** Distance between the predicted position and the one the last view gave, in units. */
  gap: number;
  /** True when the drawn cursor was teleported rather than eased: a jump the player sees. */
  snapped: boolean;
  /** Units the budget is refusing right now, as `predictCursor` reports them. */
  truncated: number;
  /** Predicted position: how far the drawn cursor went, which tells a glide from a stop. */
  predicted: Point;
  /**
   * The position the last view gave. The loss is read from it, not from the prediction: that one
   * steps back and forth as views land, and its steps read a loss of 70 % as 27 % at no latency.
   */
  official: Point;
}

/** The worst of each figure, kept both over the last three seconds and over the whole game. */
export interface Extremes {
  gap: number;
  /** Fastest the hand went over one send, in units per second. */
  peak: number;
  /** Longest the cursor kept moving after the hand stopped, in milliseconds. */
  glide: number;
  /** Largest movement one mouse event brought, in units: a flick is spread, a spurious jump not. */
  largestEvent: number;
}

/** The maxima of the whole game, so that the key can be pressed once the moment has passed. */
export interface GameMaxima extends Extremes {
  askedPerSecond: number;
  lostShare: number;
  truncated: number;
  /** Jumps since the game started. A count, not a rate: what matters is whether any happened. */
  snaps: number;
}

export interface PredictionReadout {
  gap: number;
  /** Visible jumps per second: the number this instrument exists to produce. */
  snapsPerSecond: number;
  /** Units the mouse asked for, and units the server really moved the cursor, per second. */
  askedPerSecond: number;
  travelledPerSecond: number;
  /** Share of the gesture that never reached the arena, 0 to 1; `null` if too little was asked. */
  lostShare: number | null;
  truncatedNow: number;
  frames: number;
  window: Extremes;
  game: GameMaxima;
}

export interface PredictionProbe {
  /** Called from the mouse listener, with the movement already turned into units. */
  asked: (units: number) => void;
  frame: (point: FramePoint) => void;
  read: (now: number) => PredictionReadout;
}
