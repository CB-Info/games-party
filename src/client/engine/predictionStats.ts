import { distance, type Point } from "../../shared/cursor/collision";
import { createGestureMeter } from "./gestureMeter";
import type {
  Extremes,
  FramePoint,
  GameMaxima,
  PredictionProbe,
  PredictionReadout,
} from "./predictionStats.types";

/**
 * How far back the readout looks, in milliseconds. Averages taken since the start of a game would
 * drown the very thing being hunted: a jump lasts a few frames, and three seconds is about what a
 * hand remembers of the gesture that caused it.
 */
const WINDOW_MS = 3000;

/**
 * How much of that window must be filled before a rate counts towards the maxima of the game.
 * The first frames of a game, and the first after a still mouse, hold one movement and no time to
 * divide it by: they would pin every maximum at an absurd value for the rest of the game.
 */
const TRUSTED_SPAN_MS = 1000;

/**
 * How much the hand must have asked for, in units, before a share of it can be said to be lost.
 * Below this — a flick of a few centimetres — rounding alone can make a share say anything.
 */
const MIN_ASKED_UNITS = 100;

interface Entry extends Extremes {
  at: number;
  snapped: boolean;
  truncated: number;
  asked: number;
  travelled: number;
}

/** What the hand asked for over the window, what the server did with it, and the share lost. */
interface Loss {
  asked: number;
  travelled: number;
  lost: number | null;
}

/**
 * Collects what the prediction does, frame by frame, and answers questions both about the last
 * few seconds and about the game as a whole (docs/architecture.md, §6.5). Development only: the
 * renderer reaches it through a dynamic import, so neither this module nor its readout is in the
 * production bundle.
 *
 * The sums are taken afresh from the window every time, never kept as running totals: added to and
 * taken from for a whole game, those end on crumbs of rounding instead of zero once the hand has
 * been still, and a share of two crumbs read as a loss of 195 %.
 */
export function createPredictionStats(): PredictionProbe {
  const entries: Entry[] = [];
  const game: GameMaxima = {
    ...extremesOf([]),
    askedPerSecond: 0,
    lostShare: 0,
    truncated: 0,
    snaps: 0,
  };
  const gesture = createGestureMeter();

  let askedSinceFrame = 0;
  let largestSinceFrame = 0;
  let previousPredicted: Point | null = null;
  let previousOfficial: Point | null = null;

  function prune(now: number): void {
    while (entries.length > 0 && (entries[0]?.at ?? 0) <= now - WINDOW_MS) {
      entries.shift();
    }
  }

  /** The span the window really covers, which is not its nominal length early in a game. */
  function spanMs(): number {
    const first = entries[0]?.at;
    const last = entries.at(-1)?.at;

    return first === undefined || last === undefined ? 0 : last - first;
  }

  return {
    asked(units: number): void {
      askedSinceFrame += units;
      largestSinceFrame = Math.max(largestSinceFrame, units);
    },

    frame(point: FramePoint): void {
      const drawn = previousPredicted === null ? 0 : distance(previousPredicted, point.predicted);
      const travelled = previousOfficial === null ? 0 : distance(previousOfficial, point.official);
      const { peak, glide } = gesture.frame(point.at, askedSinceFrame, drawn);
      previousPredicted = point.predicted;
      previousOfficial = point.official;

      const { at, gap, snapped, truncated } = point;
      const largestEvent = largestSinceFrame;
      entries.push({
        at,
        gap,
        snapped,
        truncated,
        asked: askedSinceFrame,
        travelled,
        peak,
        glide,
        largestEvent,
      });
      askedSinceFrame = 0;
      largestSinceFrame = 0;
      prune(at);

      game.gap = Math.max(game.gap, gap);
      game.peak = Math.max(game.peak, peak);
      game.glide = Math.max(game.glide, glide);
      game.largestEvent = Math.max(game.largestEvent, largestEvent);
      game.truncated = Math.max(game.truncated, truncated);
      game.snaps += snapped ? 1 : 0;

      const span = spanMs();
      if (span >= TRUSTED_SPAN_MS) {
        const { asked, lost } = lossOf(entries);
        game.askedPerSecond = Math.max(game.askedPerSecond, (asked * 1000) / span);
        game.lostShare = Math.max(game.lostShare, lost ?? 0);
      }
    },

    read(now: number): PredictionReadout {
      prune(now);
      const last = entries.at(-1);
      const span = Math.max(spanMs(), 1);
      const { asked, travelled, lost } = lossOf(entries);

      return {
        gap: last?.gap ?? 0,
        snapsPerSecond: (entries.filter((entry) => entry.snapped).length * 1000) / span,
        askedPerSecond: (asked * 1000) / span,
        travelledPerSecond: (travelled * 1000) / span,
        lostShare: lost,
        truncatedNow: last?.truncated ?? 0,
        frames: entries.length,
        window: extremesOf(entries),
        game: { ...game },
      };
    },
  };
}

/** The worst of each figure over the window, or zeroes for an empty one. */
function extremesOf(entries: readonly Extremes[]): Extremes {
  const worst = (of: (entry: Extremes) => number): number =>
    entries.reduce((best, entry) => Math.max(best, of(entry)), 0);

  return {
    gap: worst((entry) => entry.gap),
    peak: worst((entry) => entry.peak),
    glide: worst((entry) => entry.glide),
    largestEvent: worst((entry) => entry.largestEvent),
  };
}

function lossOf(entries: readonly Entry[]): Loss {
  const asked = entries.reduce((total, entry) => total + entry.asked, 0);
  const travelled = entries.reduce((total, entry) => total + entry.travelled, 0);
  const lost = asked < MIN_ASKED_UNITS ? null : Math.min(1, Math.max(0, 1 - travelled / asked));

  return { asked, travelled, lost };
}
