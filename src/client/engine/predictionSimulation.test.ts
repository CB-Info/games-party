import { describe, expect, it } from "vitest";

import { ARENA_WIDTH, MOVE_BUDGET_CAP_MS, MOVE_SUBSTEP } from "../../shared/constants";
import { WALLS } from "../../games/cursor-tag/shared/map";
import { budgetCap } from "../../shared/cursor/moveCursor";
import { runPredictionSimulation } from "./predictionSimulation.fixture";

const BASE = { maxSpeed: 1000, radius: 14, arenaPixels: 1004, mousePixelsPerSecond: 2500 };

/** The widths a real window gives the arena, from a small laptop to a wide screen. */
const ARENA_SIZES = [930, 1004, 1366, 1600, 1920];

/**
 * The two modes of the engine: what the budget refuses is lost, as everywhere today, or kept for
 * 300 ms and paid afterwards — the sandbox's « Rattrapage », at the length suggested at 1000 u/s.
 */
const MODES = [0, 300];

describe.each(MODES)("the drawn cursor, with %i ms of catch-up", (catchUpMs) => {
  it.each([2500, 5707, 9000, 12_000])("stays smooth with a mouse at %i px/s", (mouse) => {
    // A real mouse was measured at 5707 px/s on this project's own machine, past the 5000 this
    // file first swept. Nothing about the drawing degrades above it: only the share of the
    // gesture the ceiling throws away keeps climbing, which is the ceiling's business.
    const reserve = (BASE.maxSpeed * MOVE_BUDGET_CAP_MS) / 1000;

    for (const lagMs of [0, 20, 200]) {
      const run = { ...BASE, mousePixelsPerSecond: mouse, lagMs, catchUpMs };
      const result = runPredictionSimulation(run);

      expect(result.snaps).toBe(0);
      expect(result.maxDrawnJerk).toBeLessThan((reserve * 3) / 4);
    }
  });

  it.each([0, 20, 200, 600, 1000])("never teleports, %i ms away", (lagMs) => {
    // The correction is hidden in a fading offset, so the player's own movement is drawn whole
    // and only what the server took back is eased in. Nothing is ever taken at once below a
    // disagreement the engine can actually produce (§6.5). Before this, a mouse past roughly
    // 580 units a second made the cursor teleport seven to fifteen times a second.
    expect(runPredictionSimulation({ ...BASE, lagMs, catchUpMs }).snaps).toBe(0);
  });

  it.each([1000, 4000, 8000])("moves no further than the hand asked, at %i u/s", (maxSpeed) => {
    // What the drawn cursor may add to the gesture is the correction still fading, taken a frame
    // at a time; the correction cannot exceed twice the movement reserve, so the reserve bounds
    // the excess. Over the mouse speeds, latencies, arena widths and speeds swept at step 3b the
    // worst case sat at 0.60 of the reserve, in both modes; three quarters leaves room without
    // being able to hide a return of the old jitter, which snapped rather than easing.
    const reserve = (maxSpeed * MOVE_BUDGET_CAP_MS) / 1000;
    const worst = Math.max(
      ...[0, 20, 200, 600].map(
        (lagMs) => runPredictionSimulation({ ...BASE, maxSpeed, lagMs, catchUpMs }).maxDrawnJerk,
      ),
    );

    expect(worst).toBeLessThan((reserve * 3) / 4);
  });

  it("lands back on the official position once the mouse has been still", () => {
    // Nothing is waiting any more, and whatever was owed has been paid: the prediction has
    // nothing to add to what the server said. A client still replaying inputs the server has
    // already applied, or gliding on a remainder the server no longer holds, would stop elsewhere.
    for (const lagMs of [0, 20, 40]) {
      const result = runPredictionSimulation({ ...BASE, lagMs, catchUpMs, idleMs: 1000 });
      expect(result.settledGap).toBeCloseTo(0, 6);
    }
  });

  it("glides with the server once the hand has stopped, instead of stepping after it", () => {
    // Once every input is applied, what is left to predict is what is still owed. A client that
    // ignored the remainder the view carries would stand still between views and jump a tick's
    // payment at each one — 132 units at 2000 u/s. Against an edge the two sides may still stop a
    // little apart, having paid in slices of different sizes: never by more than one sub-step.
    for (const lagMs of [0, 20, 200]) {
      for (const maxSpeed of [1000, 2000]) {
        const run = { ...BASE, maxSpeed, lagMs, catchUpMs, idleMs: 2 * lagMs + 1000 };
        expect(runPredictionSimulation(run).maxStillJump).toBeLessThan(MOVE_SUBSTEP);
      }
    }
  });

  it("is no worse against the walls than in the open", () => {
    const open = runPredictionSimulation({ ...BASE, lagMs: 20, catchUpMs });
    const walled = runPredictionSimulation({ ...BASE, lagMs: 20, walls: WALLS, catchUpMs });

    expect(walled.snaps).toBe(0);
    expect(walled.maxGap).toBeLessThanOrEqual(open.maxGap);
    expect(walled.settledGap).toBeCloseTo(0, 6);
  });
});

describe.each(MODES)("a hole in the network, with %i ms of catch-up", (catchUpMs) => {
  // What TCP does after a lost packet: nothing for a while, then everything at once. Views held on
  // the way in used to jump the cursor forward when they landed, a whole hole's worth of travel.
  const holes = [
    { way: "in" as const, at: 2000, ms: 200 },
    { way: "in" as const, at: 2000, ms: 400 },
    { way: "out" as const, at: 2000, ms: 200 },
    { way: "out" as const, at: 2000, ms: 400 },
  ];

  it.each([0, 20, 50, 200])("never teleports the cursor, %i ms away", (lagMs) => {
    for (const hole of holes) {
      const run = { ...BASE, lagMs, catchUpMs, hole, durationMs: 4000, idleMs: 2 * lagMs + 1000 };
      const result = runPredictionSimulation(run);

      expect(result.snaps).toBe(0);
      expect(result.settledGap).toBeCloseTo(0, 6);
    }
  });

  it.each([0, 20, 200])(
    "lands the views held on the way in without a jump, %i ms away",
    (lagMs) => {
      // The server went on applying inputs while no view came, and the prediction went on replaying
      // them at the same rhythm: when the held views land, they confirm where the cursor already is.
      for (const ms of [200, 400]) {
        const hole = { way: "in" as const, at: 2000, ms };
        const result = runPredictionSimulation({
          ...BASE,
          lagMs,
          catchUpMs,
          hole,
          durationMs: 4000,
        });

        expect(result.maxPredictionJump).toBeLessThan(budgetCap(BASE.maxSpeed));
      }
    },
  );
});

describe("the client and the server side by side", () => {
  it("jumps further when the answer takes longer to come back", () => {
    // The jump is what the player sees: the predicted position moving on its own when a view
    // lands. More latency means more inputs waiting, so more to take back at once.
    const near = runPredictionSimulation({ ...BASE, lagMs: 0 });
    const far = runPredictionSimulation({ ...BASE, lagMs: 40 });

    expect(far.maxPredictionJump).toBeGreaterThan(near.maxPredictionJump);
  });

  it("loses nothing to the budget while the mouse stays under the ceiling", () => {
    // 400 px/s on a 1004 px arena asks for about 638 units a second, well under the 1000 allowed.
    const result = runPredictionSimulation({ ...BASE, mousePixelsPerSecond: 400 });

    expect(result.truncatedUnits / result.asked).toBeLessThan(0.02);
    expect(result.truncatedShare).toBeLessThan(0.05);
  });

  it.each(ARENA_SIZES)("throws away more of the same gesture on a %i px arena", (arenaPixels) => {
    const result = runPredictionSimulation({ ...BASE, arenaPixels });
    const lost = result.truncatedUnits / result.asked;

    // What a pixel is worth depends on the screen, so the same hand movement meets the ceiling
    // sooner on a small arena: two players on different screens do not get the same cursor
    // (docs/architecture.md, §6.4). The share lost follows the ceiling divided by what was asked.
    const ceiling = (BASE.maxSpeed * arenaPixels) / ARENA_WIDTH;

    expect(lost).toBeCloseTo(1 - ceiling / BASE.mousePixelsPerSecond, 1);
  });
});
