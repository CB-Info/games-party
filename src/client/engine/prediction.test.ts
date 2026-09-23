import { describe, expect, it } from "vitest";

import { SERVER_TICK_RATE } from "../../shared/constants";
import type { Wall } from "../../shared/cursor/collision";
import { budgetCap, moveCursor } from "../../shared/cursor/moveCursor";
import type { SentInput } from "./inputLedger";
import { predictCursor } from "./prediction";

const MAX_SPEED = 1000;
const RADIUS = 14;
const TICK_MS = 1000 / SERVER_TICK_RATE;
/** What one tick refills: the budget a view carries while its player keeps moving. */
const ONE_TICK = (MAX_SPEED * TICK_MS) / 1000;
const NO_DELTA = { x: 0, y: 0 };

/** The view arrives at 1000; acknowledgements take 20 ms, so its tick sits at 980. */
const VIEW_AT = 1000;
const ACK_MS = 20;
const VIEW_TICK = VIEW_AT - ACK_MS;

function sent(seq: number, dx: number, sentAt: number): SentInput {
  return { seq, dx, dy: 0, sentAt };
}

/** Inputs sent every tick from `from`, each asking for `dx`. */
function everyTick(count: number, dx: number, from: number): SentInput[] {
  return Array.from({ length: count }, (_, index) => sent(index, dx, from + index * TICK_MS));
}

function predict(overrides: Partial<Parameters<typeof predictCursor>[0]> = {}) {
  return predictCursor({
    officialPosition: { x: 400, y: 400 },
    officialBudget: ONE_TICK,
    officialBacklog: NO_DELTA,
    pendingInputs: [],
    pendingDelta: NO_DELTA,
    viewReceivedAt: VIEW_AT,
    now: VIEW_AT,
    ackDelayMs: ACK_MS,
    maxSpeed: MAX_SPEED,
    catchUpMs: 0,
    radius: RADIUS,
    walls: [],
    ...overrides,
  });
}

describe("predictCursor", () => {
  it("stays where the server said when nothing is waiting", () => {
    expect(predict().position).toEqual({ x: 400, y: 400 });
  });

  it("replays what the server has not applied yet", () => {
    const pendingInputs = [sent(0, 20, VIEW_TICK + TICK_MS), sent(1, 25, VIEW_TICK + 2 * TICK_MS)];

    expect(predict({ pendingInputs, now: VIEW_TICK + 2 * TICK_MS }).position.x).toBeCloseTo(445, 6);
  });

  it("finishes with the movement not sent yet", () => {
    expect(predict({ pendingDelta: { x: 15, y: 0 } }).position.x).toBeCloseTo(415, 6);
  });

  it("gives the first input no more than the view's budget before the view's next tick", () => {
    // The view's budget is what the server spends at its next tick. An input sent before that tick
    // lands on it and gets exactly that — not what an extra recharge would add.
    const early = predict({ pendingInputs: [sent(0, 200, VIEW_TICK + TICK_MS)] });

    expect(early.position.x).toBeCloseTo(400 + ONE_TICK, 6);
  });

  it("gives each input what the server refills between it and the one before", () => {
    // The last view came long ago; ten inputs have left since, one per tick, each asking for more
    // than a tick allows. The server went on applying them at that rhythm, a tick's budget each:
    // replaying them so is what keeps the cursor moving when views stop coming.
    const pendingInputs = everyTick(10, 100, VIEW_TICK + TICK_MS);
    const now = VIEW_TICK + 10 * TICK_MS;

    expect(predict({ pendingInputs, now }).position.x).toBeCloseTo(400 + 10 * ONE_TICK, 6);
  });

  it("lands together the inputs a view should have acknowledged, as the network will", () => {
    // The same ten inputs, but a fresh view that acknowledges none of them: they are held on the
    // way, and will reach the server in one burst paid from a single tick's budget.
    const pendingInputs = everyTick(10, 100, VIEW_TICK - 400);
    const now = VIEW_AT + 5;

    const held = predict({ pendingInputs, now });

    expect(held.position.x).toBeLessThanOrEqual(400 + budgetCap(MAX_SPEED));
  });

  it("judges nothing held before an acknowledgement has told how long they take", () => {
    const pendingInputs = everyTick(10, 100, VIEW_TICK - 400);

    const unknown = predict({ pendingInputs, now: VIEW_AT + 5, ackDelayMs: null });

    expect(unknown.position.x).toBeGreaterThan(400 + budgetCap(MAX_SPEED));
  });

  it("never invents speed: no further ahead than top speed since the view's tick, plus the reserve", () => {
    for (const count of [1, 20, 100]) {
      for (const now of [VIEW_AT, VIEW_AT + 500, VIEW_AT + 5000]) {
        const pendingInputs = everyTick(count, 400, VIEW_TICK + TICK_MS).filter(
          (input) => input.sentAt <= now,
        );
        const predicted = predict({ pendingInputs, pendingDelta: { x: 400, y: 0 }, now });

        const allowed = budgetCap(MAX_SPEED) + (MAX_SPEED * (now - VIEW_TICK)) / 1000;
        expect(predicted.position.x - 400).toBeLessThanOrEqual(allowed + 1e-9);
      }
    }
  });

  it("gives exactly what the server computes for inputs landing one per tick", () => {
    const walls: Wall[] = [{ x: 800, y: 0, width: 40, height: 900 }];
    const pendingInputs = [
      sent(0, 120, VIEW_TICK + TICK_MS),
      sent(1, 300, VIEW_TICK + 2 * TICK_MS),
      sent(2, 40, VIEW_TICK + 3 * TICK_MS),
    ];

    const predicted = predict({
      officialPosition: { x: 600, y: 400 },
      pendingInputs,
      now: VIEW_TICK + 3 * TICK_MS,
      walls,
    });

    // The server's own steps: each input on its tick with what is in hand, then a tick's refill.
    let position = { x: 600, y: 400 };
    let budget = ONE_TICK;
    for (const input of pendingInputs) {
      const moved = moveCursor({
        position,
        delta: { x: input.dx, y: input.dy },
        budget,
        maxSpeed: MAX_SPEED,
        radius: RADIUS,
        walls,
      });
      position = moved.position;
      budget = Math.min(moved.budget + ONE_TICK, budgetCap(MAX_SPEED));
    }

    expect(predicted.position.x).toBeCloseTo(position.x, 6);
    expect(predicted.position.y).toBeCloseTo(position.y, 6);
  });

  it("obeys the walls, so a predicted cursor never shows inside one", () => {
    const walls: Wall[] = [{ x: 500, y: 0, width: 40, height: 900 }];

    const predicted = predict({ officialBudget: 500, pendingDelta: { x: 300, y: 0 }, walls });

    expect(predicted.position.x).toBeLessThanOrEqual(500 - RADIUS);
  });

  it("restarts from the remainder the view carries, and pays it as time goes by", () => {
    // Sixty units are still owed. The budget the view carries is spent at its next tick, and the
    // server pays the remainder at every tick after: the prediction glides at the same pace.
    const owing = { officialBacklog: { x: 60, y: 0 }, catchUpMs: 300, officialBudget: 0 };

    expect(predict({ ...owing, now: VIEW_TICK + TICK_MS }).position.x).toBeCloseTo(400, 6);
    expect(predict({ ...owing, now: VIEW_TICK + TICK_MS + 20 }).position.x).toBeCloseTo(420, 6);
    expect(predict({ ...owing, now: VIEW_TICK + TICK_MS + 60 }).position.x).toBeCloseTo(460, 6);
  });

  it("keeps what the replay could not pay, so that the next frame can go on with it", () => {
    // At the view's next tick, the movement gathered gets the view's budget; the rest is owed.
    const now = VIEW_TICK + TICK_MS;
    const predicted = predict({ catchUpMs: 300, pendingDelta: { x: 50, y: 0 }, now });

    expect(predicted.position.x).toBeCloseTo(400 + ONE_TICK, 6);
    expect(predicted.backlog.x).toBeCloseTo(50 - ONE_TICK, 6);
    expect(predicted.truncated).toBeCloseTo(0, 6);
  });
});
