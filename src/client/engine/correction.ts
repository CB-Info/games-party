import { CORRECTION_SMOOTHING_MS } from "../../shared/constants";
import { distance, type Point } from "../../shared/cursor/collision";
import { budgetCap } from "../../shared/cursor/moveCursor";

const ORIGIN: Point = { x: 0, y: 0 };

/** Below this the correction is over. Keeping it would have the cursor creep for ever. */
const SETTLED_UNITS = 0.05;

export interface CursorSmoother {
  /**
   * A view landed and moved the prediction on its own. Both positions are taken at the same
   * instant, one with the previous view and one with the new: their difference is what the server
   * corrected, with nothing of the player's own movement in it.
   *
   * `roundTripMs` is how long acknowledgements take lately, zero before any has come: the further
   * the prediction runs ahead of what the server has confirmed, the larger a correction may
   * legitimately be.
   *
   * Returns true when the correction was larger than the engine can produce, and was therefore
   * taken at once rather than hidden.
   */
  correct: (asBefore: Point, asNow: Point, roundTripMs?: number) => boolean;
  /** Where to draw this frame, and the moment to let the correction fade a little further. */
  positionAt: (predicted: Point, dtMs: number) => Point;
  /** What is left to absorb, in units, for the development readout. */
  pending: () => number;
}

/**
 * Hides the server's corrections without touching the player's own movement
 * (docs/architecture.md, §6.5).
 *
 * The drawn cursor is the prediction **plus an offset** that fades to nothing, rather than a
 * position sliding towards the prediction. The difference matters: sliding also smooths the
 * player's own gesture, so the cursor trails the hand by the whole smoothing time and, past a
 * fairly slow movement, that trail grows past the point where it is taken at once and the cursor
 * is teleported several times a second. With an offset, a hand movement is drawn at once and at
 * full size, and only what the server took back is eased in.
 */
export function createCursorSmoother(maxSpeed: number): CursorSmoother {
  // The most the engine can possibly disagree with itself. A correction is the difference between
  // two predictions, each within one movement reserve of the position its own view gave, plus what
  // the prediction replays ahead of the server: at most one round trip of travel, taken back at
  // once when a view shows inputs held on the way. Beyond that, nothing the network did explains
  // the move — the game put the cursor elsewhere, and easing across the arena would be worse to
  // watch than arriving. The shortest portal jump of Cursor Tag, 1511 units, stays far above it.
  const gameMovedIt = (roundTripMs: number): number =>
    2 * budgetCap(maxSpeed) + (maxSpeed * roundTripMs) / 1000;
  let error: Point = ORIGIN;

  return {
    correct(asBefore: Point, asNow: Point, roundTripMs = 0): boolean {
      const kept = { x: error.x + asBefore.x - asNow.x, y: error.y + asBefore.y - asNow.y };

      if (distance(ORIGIN, kept) > gameMovedIt(roundTripMs)) {
        error = ORIGIN;
        return true;
      }

      error = kept;
      return false;
    },

    positionAt(predicted: Point, dtMs: number): Point {
      // Time-based rather than per-frame, so the correction takes as long on a 60 Hz screen as on
      // a 144 Hz one.
      const factor = Math.min(1, Math.max(0, dtMs / CORRECTION_SMOOTHING_MS));
      const faded = { x: error.x * (1 - factor), y: error.y * (1 - factor) };
      error = distance(ORIGIN, faded) < SETTLED_UNITS ? ORIGIN : faded;

      return { x: predicted.x + error.x, y: predicted.y + error.y };
    },

    pending: () => distance(ORIGIN, error),
  };
}
