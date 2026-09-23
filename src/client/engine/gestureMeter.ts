import { INPUT_SEND_RATE } from "../../shared/constants";

/**
 * The peak of a gesture is taken over one send. That is the slice of movement the budget judges at
 * once (docs/architecture.md, §6.5), so it is the speed that decides whether a gesture is cut —
 * unlike an average over seconds, which includes the pauses between gestures and can sit far below.
 */
const PEAK_WINDOW_MS = 1000 / INPUT_SEND_RATE;

/** Below this, in logical units, a frame's movement is rounding and not a cursor still going. */
const STILL_UNITS = 0.01;

export interface GestureFrame {
  /** Fastest the hand went over the last send, in units per second, or 0 before a whole send. */
  peak: number;
  /**
   * How long the cursor has kept moving since the hand stopped, in milliseconds, or 0. It is the
   * catch-up of the sandbox's « Rattrapage » mode as the player sees it; without that mode it
   * stays close to zero, because the prediction stops with the hand.
   */
  glide: number;
}

export interface GestureMeter {
  /**
   * One frame: what the hand asked for since the previous frame, and how far the predicted cursor
   * went, both in logical units.
   */
  frame: (at: number, asked: number, travelled: number) => GestureFrame;
}

/**
 * What a gesture looks like frame by frame, as opposed to what the prediction does with it
 * (development readout, docs/architecture.md §6.5). Split from the readout's collector because it
 * answers a different question: not "how far apart are client and server", but "how fast was the
 * hand, and how long did the cursor take to follow".
 */
export function createGestureMeter(): GestureMeter {
  // The frames of the last send, plus the one just before it, whose time is where they start.
  const recent: Array<{ at: number; asked: number }> = [];
  let lastHandAt: number | null = null;
  let gliding = false;

  function peakAt(at: number, asked: number): number {
    recent.push({ at, asked });
    while (recent.length > 2 && (recent[1]?.at ?? at) <= at - PEAK_WINDOW_MS) {
      recent.shift();
    }

    const span = at - (recent[0]?.at ?? at);
    if (span < PEAK_WINDOW_MS) {
      return 0;
    }

    // The first frame only marks where the window starts: what it brought came before.
    const moved = recent.slice(1).reduce((total, frame) => total + frame.asked, 0);
    return (moved * 1000) / span;
  }

  /**
   * A glide lasts only while the cursor moves in every frame since the hand stopped. Once it has
   * stood still, a later movement — a correction landing with a late view — is not a catch-up.
   */
  function glideAt(at: number, asked: number, travelled: number): number {
    if (asked > 0) {
      lastHandAt = at;
      gliding = true;
      return 0;
    }

    if (!gliding || lastHandAt === null || travelled <= STILL_UNITS) {
      gliding = false;
      return 0;
    }

    return at - lastHandAt;
  }

  return {
    frame: (at, asked, travelled) => ({
      peak: peakAt(at, asked),
      glide: glideAt(at, asked, travelled),
    }),
  };
}
