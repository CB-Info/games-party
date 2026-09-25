import type { Point, Wall } from "../../shared/cursor/collision";
import type { CursorInput } from "../../shared/cursor/cursorInput";
import { createInputLedger } from "./inputLedger";
import { createOwnCursor, type Landing } from "./ownCursor";
import type { StepSetup, View } from "./simulatedServer.fixture";

/** Where the cursor was predicted at a frame, and where it was drawn once smoothed. */
export interface DrawnFrame {
  predicted: Point;
  drawn: Point;
}

/**
 * What the browser does in a simulation, with the engine's own parts (docs/architecture.md, §6.5):
 * it numbers and records what it sends, and hands every view to the same local cursor the games
 * run, which predicts from it and eases the corrections. It measures nothing itself: the
 * simulation reads it from outside, as it reads the server.
 */
export interface SimulatedClient {
  /** Records a movement as sent at `now`, and returns the input the network is to carry. */
  send: (dx: number, now: number) => CursorInput;
  /**
   * The last of the views that landed at `now`: what they applied is acknowledged, the prediction
   * restarts from it, and the correction it brings is handed to the smoothing.
   */
  receive: (view: View, now: number) => Landing | null;
  /** Where the client thinks its cursor is, right now. */
  predictAt: (now: number) => Point;
  /** True while some input has not been acknowledged yet. */
  hasPending: () => boolean;
  /** One frame: the cursor is placed, and the correction fades a little further. */
  frame: (now: number, frameMs: number) => DrawnFrame;
}

export function createSimulatedClient(
  setup: StepSetup,
  walls: readonly Wall[],
  firstView: View,
): SimulatedClient {
  const ledger = createInputLedger();
  // The simulated mouse sends each movement whole, the moment it is made: nothing is gathered
  // between two sends.
  const cursor = createOwnCursor({
    inputs: { ...ledger, pendingDelta: () => ({ x: 0, y: 0 }) },
    radius: setup.radius,
    walls,
    catchUpMs: setup.catchUpMs ?? 0,
  });
  let nextSeq = 0;

  const sampleOf = (view: View, now: number) => ({
    receivedAt: now,
    lastProcessedSeq: view.seq,
    snapshot: {
      position: view.position,
      budget: view.budget,
      backlog: view.backlog,
      maxSpeed: setup.maxSpeed,
      frozen: false,
    },
  });

  cursor.land(sampleOf(firstView, 0), 0);

  function predictAt(now: number): Point {
    const predicted = cursor.predict(now);
    if (predicted === null) {
      throw new Error("the simulated client always has a view");
    }
    return predicted.position;
  }

  return {
    send(dx: number, now: number): CursorInput {
      const input: CursorInput = { seq: nextSeq++, dx, dy: 0 };
      ledger.record(input, now);
      return input;
    },

    receive: (view: View, now: number): Landing | null => cursor.land(sampleOf(view, now), now),

    predictAt,

    hasPending: () => ledger.pending().length > 0,

    frame(now: number, frameMs: number): DrawnFrame {
      const frame = cursor.draw(now, frameMs, now);
      if (frame === null) {
        throw new Error("the simulated client always has a view");
      }
      return { predicted: frame.predicted.position, drawn: frame.drawn };
    },
  };
}
