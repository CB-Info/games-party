import { distance, type Point, type Wall } from "../../shared/cursor/collision";
import { createCursorSmoother } from "./correction";
import type { SentInput } from "./inputLedger";
import { predictCursor, type PredictionResult } from "./prediction";
import type { PredictionProbe } from "./predictionStats.types";

/** What one view says of this browser's own cursor, read by the game from its own view. */
export interface OwnSnapshot {
  position: Point;
  budget: number;
  backlog: Point;
  /** The cursor's top speed in that view: a game may tie it to a role. */
  maxSpeed: number;
  /**
   * The game holds the cursor still (Cursor Tag's freeze): nothing is replayed, since the server
   * applies none of the inputs, and the cursor stays where the view puts it.
   */
  frozen: boolean;
}

/** One view, as the local cursor needs it. */
export interface OwnSample {
  receivedAt: number;
  /** The last input the server applied, or `null` when the view has no `me` (a spectator). */
  lastProcessedSeq: number | null;
  /** `null` when the view places no cursor of this browser, such as between two rounds. */
  snapshot: OwnSnapshot | null;
}

/** The part of the input sender the local cursor reads: what is waiting, and how long it takes. */
export interface OwnCursorInputs {
  acknowledge: (lastProcessedSeq: number, receivedAt: number) => void;
  pending: () => readonly SentInput[];
  ackDelayMs: () => number | null;
  pendingDelta: () => Point;
}

export interface OwnCursorDeps {
  inputs: OwnCursorInputs;
  radius: number;
  walls: readonly Wall[];
  /** How long the cursor may keep catching up, as the game set it; zero keeps nothing. */
  catchUpMs: number;
  /** The development readout, read at each frame since it is loaded after the first one. */
  probe?: () => PredictionProbe | null;
}

/** What a landing view changed: the prediction just before and just after, and whether it snapped. */
export interface Landing {
  before: Point;
  after: Point;
  snapped: boolean;
}

export interface OwnFrame {
  predicted: PredictionResult;
  /** Where to draw the cursor: the prediction, plus what is left of the corrections. */
  drawn: Point;
}

export interface OwnCursor {
  /**
   * A view is taken into account: what it applied is acknowledged, and the prediction restarts
   * from it. Called once per new view, with the clock the send times are read on. Returns the
   * correction it brought, or `null` when there is none to ease — no view before it, or one of the
   * two placing no cursor.
   */
  land: (sample: OwnSample, now: number) => Landing | null;
  /** Where the cursor is, as far as this browser can tell, without changing anything. */
  predict: (now: number) => PredictionResult | null;
  /** One frame: where to draw, and the corrections fading `dtMs` further. */
  draw: (now: number, dtMs: number, frameAt: number) => OwnFrame | null;
}

/**
 * This browser's own cursor, frame after frame (docs/architecture.md, §6.5): the acknowledgements,
 * the prediction from the last view, the correction a new view brings, eased rather than jumped,
 * and the figures of the development readout. Both games and the prediction simulation go through
 * it, so that the simulation measures the code that runs.
 *
 * A view that places no cursor — the preparation of a Cursor Tag round — is still taken in: it
 * acknowledges inputs, or twenty seconds of them would wait to be replayed. What it cannot do is
 * correct: the next round starts from a spawn point, and easing towards it from where the last
 * round ended would glide the cursor across the arena.
 */
export function createOwnCursor(deps: OwnCursorDeps): OwnCursor {
  const smoother = createCursorSmoother();
  let current: OwnSample | null = null;
  // Whether a landing since the last frame was taken at once: the readout counts what is seen.
  let snappedSinceFrame = false;

  function predict(now: number): PredictionResult | null {
    const snapshot = current?.snapshot ?? null;
    if (current === null || snapshot === null) {
      return null;
    }

    if (snapshot.frozen) {
      return {
        position: snapshot.position,
        budget: snapshot.budget,
        backlog: snapshot.backlog,
        truncated: 0,
      };
    }

    return predictCursor({
      officialPosition: snapshot.position,
      officialBudget: snapshot.budget,
      officialBacklog: snapshot.backlog,
      pendingInputs: deps.inputs.pending(),
      pendingDelta: deps.inputs.pendingDelta(),
      viewReceivedAt: current.receivedAt,
      now,
      ackDelayMs: deps.inputs.ackDelayMs(),
      maxSpeed: snapshot.maxSpeed,
      catchUpMs: deps.catchUpMs,
      radius: deps.radius,
      walls: deps.walls,
    });
  }

  return {
    land(sample, now) {
      // The same instant seen through the previous view: what the prediction said just before
      // this one landed. The difference is the server's correction and nothing else — the
      // player's own movement is in both, so it cancels out (§6.5).
      const before = predict(now);
      if (sample.lastProcessedSeq !== null) {
        deps.inputs.acknowledge(sample.lastProcessedSeq, sample.receivedAt);
      }
      current = sample;
      const after = predict(now);

      if (before === null || after === null || sample.snapshot === null) {
        smoother.reset();
        return null;
      }

      const snapped = smoother.correct(before.position, after.position, {
        maxSpeed: sample.snapshot.maxSpeed,
        roundTripMs: deps.inputs.ackDelayMs() ?? 0,
      });
      snappedSinceFrame ||= snapped;
      return { before: before.position, after: after.position, snapped };
    },

    predict,

    draw(now, dtMs, frameAt) {
      const predicted = predict(now);
      const official = current?.snapshot?.position ?? null;
      if (predicted === null || official === null) {
        return null;
      }

      const drawn = smoother.positionAt(predicted.position, dtMs);
      deps.probe?.()?.frame({
        at: frameAt,
        gap: distance(predicted.position, official),
        snapped: snappedSinceFrame,
        truncated: predicted.truncated,
        predicted: predicted.position,
        official,
      });
      snappedSinceFrame = false;

      return { predicted, drawn };
    },
  };
}
