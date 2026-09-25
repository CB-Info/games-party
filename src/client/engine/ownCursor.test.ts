import { describe, expect, it } from "vitest";

import { MOVE_BUDGET_CAP_MS } from "../../shared/constants";
import { NO_SEQ_PROCESSED } from "../../shared/cursor/cursorInput";
import { createInputLedger } from "./inputLedger";
import { createOwnCursor, type OwnSample, type OwnSnapshot } from "./ownCursor";
import type { FramePoint } from "./predictionStats.types";

const RADIUS = 14;
const MAX_SPEED = 1000;
/** Two reserves of travel: the largest correction the engine eases rather than takes at once. */
const TWO_RESERVES = (2 * MAX_SPEED * MOVE_BUDGET_CAP_MS) / 1000;

function snapshot(x: number, changes: Partial<OwnSnapshot> = {}): OwnSnapshot {
  return {
    position: { x, y: 450 },
    budget: 0,
    backlog: { x: 0, y: 0 },
    maxSpeed: MAX_SPEED,
    frozen: false,
    ...changes,
  };
}

function sample(receivedAt: number, cursor: OwnSnapshot | null, seq = NO_SEQ_PROCESSED): OwnSample {
  return { receivedAt, lastProcessedSeq: seq, snapshot: cursor };
}

/** A local cursor over a real ledger, with one input of `dx` sent at 10 ms and still waiting. */
function cursorWithPending(dx = 0, probe: FramePoint[] = []) {
  const ledger = createInputLedger();
  if (dx !== 0) {
    ledger.record({ seq: 0, dx, dy: 0 }, 10);
  }
  const cursor = createOwnCursor({
    inputs: { ...ledger, pendingDelta: () => ({ x: 0, y: 0 }) },
    radius: RADIUS,
    walls: [],
    catchUpMs: 0,
    probe: () => ({
      asked: () => undefined,
      frame: (point) => probe.push(point),
      read: () => null as never,
    }),
  });
  return { cursor, ledger };
}

describe("createOwnCursor", () => {
  it("replays what the server has not applied yet on top of the view", () => {
    const { cursor } = cursorWithPending(20);
    cursor.land(sample(0, snapshot(400, { budget: 66 })), 0);

    expect(cursor.predict(20)?.position.x).toBeCloseTo(420);
  });

  it("acknowledges what a view without a cursor applied, and corrects nothing across it", () => {
    // A round ends while a correction is still being eased, a preparation places no cursor, and
    // the next round starts from a spawn point far away: easing towards it, or finishing the old
    // correction there, would glide the cursor across the arena.
    const { cursor, ledger } = cursorWithPending(20);
    cursor.land(sample(0, snapshot(400, { budget: 66 })), 0);
    expect(cursor.land(sample(33, snapshot(370, { budget: 66 })), 33)?.snapped).toBe(false);

    expect(cursor.land(sample(40, null, 0), 40)).toBeNull();
    expect(ledger.pending()).toEqual([]);
    expect(cursor.land(sample(80, snapshot(1200)), 80)).toBeNull();
    expect(cursor.draw(80, 16, 80)?.drawn).toEqual({ x: 1200, y: 450 });
  });

  it("replays nothing while the game holds the cursor still, and eases it back to where it froze", () => {
    const { cursor } = cursorWithPending(30);
    cursor.land(sample(0, snapshot(400, { budget: 66 })), 0);
    const running = cursor.predict(20)?.position.x ?? 0;

    const landing = cursor.land(sample(20, snapshot(400, { frozen: true })), 20);

    expect(cursor.predict(20)?.position).toEqual({ x: 400, y: 450 });
    expect(landing).toEqual({
      before: { x: running, y: 450 },
      after: { x: 400, y: 450 },
      snapped: false,
    });
    expect(cursor.draw(20, 0, 20)?.drawn.x).toBeCloseTo(running);
  });

  it("judges a correction by the speed of the view that brings it", () => {
    const jump = TWO_RESERVES * 1.1;
    const asRunner = cursorWithPending().cursor;
    const asChat = cursorWithPending().cursor;
    asRunner.land(sample(0, snapshot(400)), 0);
    asChat.land(sample(0, snapshot(400)), 0);

    expect(asRunner.land(sample(33, snapshot(400 + jump)), 33)?.snapped).toBe(true);
    expect(
      asChat.land(sample(33, snapshot(400 + jump, { maxSpeed: MAX_SPEED * 1.15 })), 33)?.snapped,
    ).toBe(false);
  });

  it("tells the readout of a correction taken at once, on the next frame only", () => {
    const frames: FramePoint[] = [];
    const { cursor } = cursorWithPending(0, frames);
    cursor.land(sample(0, snapshot(400)), 0);
    cursor.land(sample(33, snapshot(1500)), 33);

    cursor.draw(33, 16, 33);
    cursor.draw(49, 16, 49);

    expect(frames.map((frame) => frame.snapped)).toEqual([true, false]);
    expect(frames[0]?.official).toEqual({ x: 1500, y: 450 });
  });
});
