import type { Point, Wall } from "../../shared/cursor/collision";
import type { CursorInput } from "../../shared/cursor/cursorInput";
import { createCursorSmoother } from "./correction";
import { createInputLedger } from "./inputLedger";
import { predictCursor } from "./prediction";
import type { StepSetup, View } from "./simulatedServer.fixture";

/** Where the cursor was predicted at a frame, and where it was drawn once smoothed. */
export interface DrawnFrame {
  predicted: Point;
  drawn: Point;
}

/**
 * What the browser does in a simulation, with the engine's own parts (docs/architecture.md, §6.5):
 * it numbers and records what it sends, keeps the last view, predicts its cursor from it and eases
 * the corrections. It measures nothing itself: the simulation reads it from outside, as it reads
 * the server.
 */
export interface SimulatedClient {
  /** Records a movement as sent at `now`, and returns the input the network is to carry. */
  send: (dx: number, now: number) => CursorInput;
  /** A view lands: the prediction restarts from it, and what it applied is acknowledged. */
  receive: (view: View, now: number) => void;
  /** Where the client thinks its cursor is, right now. */
  predictAt: (now: number) => Point;
  /** True while some input has not been acknowledged yet. */
  hasPending: () => boolean;
  /** Hands a correction to the smoother; true when it was too large to hide and was taken at once. */
  correct: (before: Point, after: Point) => boolean;
  /** One frame: the cursor is placed, and the correction fades a little further. */
  frame: (now: number, frameMs: number) => DrawnFrame;
}

export function createSimulatedClient(
  setup: StepSetup,
  walls: readonly Wall[],
  firstView: View,
): SimulatedClient {
  const ledger = createInputLedger();
  const smoother = createCursorSmoother(setup.maxSpeed);
  let view = firstView;
  let viewAt = 0;
  let nextSeq = 0;

  function predictAt(now: number): Point {
    return predictCursor({
      officialPosition: view.position,
      officialBudget: view.budget,
      officialBacklog: view.backlog,
      pendingInputs: ledger.pending(),
      pendingDelta: { x: 0, y: 0 },
      viewReceivedAt: viewAt,
      now,
      ackDelayMs: ledger.ackDelayMs(),
      maxSpeed: setup.maxSpeed,
      catchUpMs: setup.catchUpMs ?? 0,
      radius: setup.radius,
      walls,
    }).position;
  }

  return {
    send(dx: number, now: number): CursorInput {
      const input: CursorInput = { seq: nextSeq++, dx, dy: 0 };
      ledger.record(input, now);
      return input;
    },

    receive(arrived: View, now: number): void {
      view = arrived;
      viewAt = now;
      ledger.acknowledge(arrived.seq, now);
    },

    predictAt,

    hasPending: () => ledger.pending().length > 0,

    correct: (before: Point, after: Point): boolean =>
      smoother.correct(before, after, ledger.ackDelayMs() ?? 0),

    frame(now: number, frameMs: number): DrawnFrame {
      const predicted = predictAt(now);
      return { predicted, drawn: smoother.positionAt(predicted, frameMs) };
    },
  };
}
