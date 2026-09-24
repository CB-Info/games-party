import { describe, expect, it } from "vitest";

import type { Point } from "../../../shared/cursor/collision";
import { distanceToSegment, firstContactTime, type Segment } from "./pathGeometry";

/**
 * The reach of these cases: a plain number rather than `TAG_DISTANCE`, because the rounding cases
 * below were found for this one. The tag tests check Cursor Tag's own distance.
 */
const REACH = 28;

function path(from: Point, to: Point): Segment {
  return { from, to };
}

function still(at: Point): Segment {
  return { from: at, to: at };
}

describe("firstContactTime", () => {
  it("is 0 for two players already in reach when the tick starts", () => {
    expect(firstContactTime(still({ x: 0, y: 0 }), still({ x: REACH, y: 0 }), REACH)).toBe(0);
  });

  it("is null for two players out of reach who move together", () => {
    const a = path({ x: 0, y: 0 }, { x: 50, y: 0 });
    const b = path({ x: 0, y: REACH + 1 }, { x: 50, y: REACH + 1 });

    expect(firstContactTime(a, b, REACH)).toBeNull();
  });

  it("finds two players who cross head-on between two ticks", () => {
    // 100 apart at both ends of the tick: a test on the end positions alone would miss them.
    const a = path({ x: 0, y: 0 }, { x: 100, y: 0 });
    const b = path({ x: 100, y: 0 }, { x: 0, y: 0 });

    // The gap closes at 200 units per tick, from 100 down to the reach.
    expect(firstContactTime(a, b, REACH)).toBeCloseTo((100 - REACH) / 200);
  });

  it("finds a crossing whose paths pass exactly at reach, and not one passing a unit wider", () => {
    const a = path({ x: 0, y: 0 }, { x: 100, y: 0 });

    expect(firstContactTime(a, path({ x: 100, y: REACH }, { x: 0, y: REACH }), REACH)).toBeCloseTo(
      0.5,
    );
    expect(
      firstContactTime(a, path({ x: 100, y: REACH + 1 }, { x: 0, y: REACH + 1 }), REACH),
    ).toBeNull();
  });

  it("finds nothing for two paths that cross at different moments of the tick", () => {
    // `a` passes (50, 0) halfway through the tick, `b` a tenth of the way in: the traces cross,
    // the players never come within reach.
    const a = path({ x: 0, y: 0 }, { x: 100, y: 0 });
    const b = path({ x: 50, y: -20 }, { x: 50, y: 180 });

    expect(distanceToSegment({ x: 50, y: 0 }, b)).toBe(0);
    expect(firstContactTime(a, b, REACH)).toBeNull();
  });

  it("gives the first instant of contact, not the closest one", () => {
    // Running at a still player 80 away: in reach once 80 less the reach is run, of 100.
    const a = path({ x: 0, y: 0 }, { x: 100, y: 0 });

    expect(firstContactTime(a, still({ x: 80, y: 0 }), REACH)).toBeCloseTo((80 - REACH) / 100);
  });

  it("finds a contact on the very end of the tick, at exactly reach", () => {
    const a = path({ x: 0, y: 0 }, { x: 100 - REACH, y: 0 });

    expect(firstContactTime(a, still({ x: 100, y: 0 }), REACH)).toBe(1);
    expect(firstContactTime(a, still({ x: 101, y: 0 }), REACH)).toBeNull();
  });

  it("keeps a contact on the end of the tick that rounding would take from the bare root", () => {
    // A slanting run that stops a hair within reach: solved directly, the root rounds past the end
    // of the tick, and a test on [0, 1] would drop it.
    const a = path(
      { x: 360.0835413145492, y: 221.5737523145937 },
      { x: 387.29930860008386, y: 275.0461939182798 },
    );
    const b = still({ x: 400, y: 300 });

    expect(Math.hypot(a.to.x - b.to.x, a.to.y - b.to.y)).toBeLessThanOrEqual(REACH);
    expect(firstContactTime(a, b, REACH)).toBe(1);
  });
  it("keeps a pass that grazes the reach, which rounding would take from the bare root", () => {
    // Closest to the still player halfway through the tick, a hair within reach: solved directly,
    // the equation has no root left.
    const a = path(
      { x: 363.84567172894623, y: 301.20096993466404 },
      { x: 459.0943282710538, y: 331.65903006533597 },
    );

    expect(
      firstContactTime(a, still({ x: 402.9417431634119, y: 343.09962383179015 }), REACH),
    ).toBeCloseTo(0.5, 1);
  });
});

describe("distanceToSegment", () => {
  const segment = path({ x: 0, y: 0 }, { x: 100, y: 0 });

  it("measures square to the path beside it", () => {
    expect(distanceToSegment({ x: 40, y: 30 }, segment)).toBe(30);
  });

  it("measures to the nearest end beyond it", () => {
    expect(distanceToSegment({ x: 130, y: 40 }, segment)).toBe(50);
    expect(distanceToSegment({ x: -30, y: -40 }, segment)).toBe(50);
  });

  it("measures to the point itself for a player who did not move", () => {
    expect(distanceToSegment({ x: 3, y: 4 }, still({ x: 0, y: 0 }))).toBe(5);
  });
});
