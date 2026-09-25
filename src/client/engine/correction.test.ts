import { describe, expect, it } from "vitest";

import { CORRECTION_SMOOTHING_MS, MOVE_BUDGET_CAP_MS } from "../../shared/constants";
import { createCursorSmoother } from "./correction";

const FRAME_MS = 16;
const MAX_SPEED = 1000;

/** The most the engine can disagree with itself: two reserves. Beyond it, the game moved you. */
const BUDGET_CAP = (2 * MAX_SPEED * MOVE_BUDGET_CAP_MS) / 1000;

/** A cursor at that speed, before any acknowledgement has told how long a round trip takes. */
const LIMITS = { maxSpeed: MAX_SPEED };

describe("createCursorSmoother", () => {
  it("draws the prediction as it stands while nothing has been corrected", () => {
    const smoother = createCursorSmoother();

    expect(smoother.positionAt({ x: 300, y: 200 }, FRAME_MS)).toEqual({ x: 300, y: 200 });
  });

  it("leaves the cursor where it was when a view takes movement back", () => {
    const smoother = createCursorSmoother();

    // The view says the cursor is ten units behind where this browser had drawn it.
    smoother.correct({ x: 310, y: 200 }, { x: 300, y: 200 }, LIMITS);

    // The frame that follows still shows very nearly the old place, not the new one.
    expect(smoother.positionAt({ x: 300, y: 200 }, 0).x).toBeCloseTo(310, 6);
  });

  it("draws the player's own movement at once and at full size", () => {
    const smoother = createCursorSmoother();
    smoother.correct({ x: 310, y: 200 }, { x: 300, y: 200 }, LIMITS);

    const first = smoother.positionAt({ x: 300, y: 200 }, 0);
    // The hand moves forty units; the correction has not faded at all in between.
    const second = smoother.positionAt({ x: 340, y: 200 }, 0);

    // This is the whole point of the fix: the gesture is not smoothed, only the correction is.
    expect(second.x - first.x).toBeCloseTo(40, 6);
  });

  it("has absorbed the correction once the smoothing time has passed", () => {
    const smoother = createCursorSmoother();
    smoother.correct({ x: 340, y: 200 }, { x: 300, y: 200 }, LIMITS);
    smoother.positionAt({ x: 300, y: 200 }, CORRECTION_SMOOTHING_MS);

    expect(smoother.pending()).toBe(0);
    expect(smoother.positionAt({ x: 300, y: 200 }, FRAME_MS)).toEqual({ x: 300, y: 200 });
  });

  it("fades at the same speed whatever the frame rate", () => {
    const slow = createCursorSmoother();
    const fast = createCursorSmoother();
    slow.correct({ x: 340, y: 200 }, { x: 300, y: 200 }, LIMITS);
    fast.correct({ x: 340, y: 200 }, { x: 300, y: 200 }, LIMITS);

    slow.positionAt({ x: 300, y: 200 }, 16);
    fast.positionAt({ x: 300, y: 200 }, 8);
    fast.positionAt({ x: 300, y: 200 }, 8);

    expect(fast.pending()).toBeCloseTo(slow.pending(), 0);
  });

  it("adds up the corrections that land before the previous one has faded", () => {
    const smoother = createCursorSmoother();
    smoother.correct({ x: 310, y: 200 }, { x: 300, y: 200 }, LIMITS);
    smoother.correct({ x: 310, y: 200 }, { x: 300, y: 200 }, LIMITS);

    expect(smoother.pending()).toBeCloseTo(20, 6);
  });

  it("takes a correction too large to hide at once, and says so", () => {
    const smoother = createCursorSmoother();
    const far = { x: 300 + BUDGET_CAP + 1, y: 200 };

    expect(smoother.correct(far, { x: 300, y: 200 }, LIMITS)).toBe(true);
    expect(smoother.pending()).toBe(0);
    expect(smoother.positionAt({ x: 300, y: 200 }, 0)).toEqual({ x: 300, y: 200 });
  });

  it("keeps a correction it can still hide, and says so", () => {
    const smoother = createCursorSmoother();
    const near = { x: 300 + BUDGET_CAP - 1, y: 200 };

    expect(smoother.correct(near, { x: 300, y: 200 }, LIMITS)).toBe(false);
    expect(smoother.pending()).toBeCloseTo(BUDGET_CAP - 1, 6);
  });

  it("hides a correction as large as one round trip of travel more, once views take that long", () => {
    // 100 ms to be acknowledged: the prediction may run that far ahead of what the server has
    // confirmed, and a view showing inputs held on the way takes it back. That is the network,
    // not the game moving the cursor: it is eased like any other correction.
    const smoother = createCursorSmoother();
    const beyondTwoReserves = { x: 300 + BUDGET_CAP + 60, y: 200 };

    expect(
      smoother.correct(
        beyondTwoReserves,
        { x: 300, y: 200 },
        { maxSpeed: MAX_SPEED, roundTripMs: 100 },
      ),
    ).toBe(false);
  });

  it("judges a correction by the speed the cursor has at that moment", () => {
    // Cursor Tag's Chat goes faster than its Runners: the same correction is within what a Chat
    // could produce, and beyond what a Runner could.
    const smoother = createCursorSmoother();
    const between = { x: 300 + BUDGET_CAP * 1.1, y: 200 };

    expect(smoother.correct(between, { x: 300, y: 200 }, { maxSpeed: MAX_SPEED * 1.15 })).toBe(
      false,
    );
    smoother.reset();
    expect(smoother.correct(between, { x: 300, y: 200 }, LIMITS)).toBe(true);
  });

  it("forgets what it was hiding once reset", () => {
    const smoother = createCursorSmoother();
    smoother.correct({ x: 340, y: 200 }, { x: 300, y: 200 }, LIMITS);

    smoother.reset();

    expect(smoother.pending()).toBe(0);
    expect(smoother.positionAt({ x: 300, y: 200 }, 0)).toEqual({ x: 300, y: 200 });
  });

  it("still takes at once a correction beyond that, as the game moving the cursor would be", () => {
    const smoother = createCursorSmoother();
    const beyondRoundTrip = { x: 300 + BUDGET_CAP + 101, y: 200 };

    expect(
      smoother.correct(
        beyondRoundTrip,
        { x: 300, y: 200 },
        { maxSpeed: MAX_SPEED, roundTripMs: 100 },
      ),
    ).toBe(true);
  });
});
