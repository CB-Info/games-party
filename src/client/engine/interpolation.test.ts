import { describe, expect, it } from "vitest";

import {
  INTERPOLATION_DELAY_MS,
  MAX_TICK_DT_MS,
  TELEPORT_SNAP_DISTANCE,
} from "../../shared/constants";
import { displayTime, frameStep, interpolatePoint } from "./interpolation";
import type { ViewSample } from "../../games/gameView.types";

const SAMPLE: ViewSample = { tick: 30, serverTime: 1000, receivedAt: 5000, view: null };

describe("displayTime", () => {
  it("draws the others a fixed delay behind the server", () => {
    // The view arrived at 5000 and it is now 5000: the moment drawn is the view's own time,
    // minus the delay that leaves room to interpolate towards the next one.
    expect(displayTime(SAMPLE, 5000)).toBe(1000 - INTERPOLATION_DELAY_MS);
  });

  it("advances with the local clock between two views", () => {
    expect(displayTime(SAMPLE, 5050)).toBe(1050 - INTERPOLATION_DELAY_MS);
  });
});

describe("interpolatePoint", () => {
  it("walks from one point to the other", () => {
    const from = { x: 100, y: 100 };
    const to = { x: 140, y: 100 };

    expect(interpolatePoint(from, to, 0)).toEqual(from);
    expect(interpolatePoint(from, to, 0.25)).toEqual({ x: 110, y: 100 });
    expect(interpolatePoint(from, to, 1)).toEqual(to);
  });

  it("stays inside the segment when the factor overshoots", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 0 };

    expect(interpolatePoint(from, to, 3)).toEqual(to);
    expect(interpolatePoint(from, to, -1)).toEqual(from);
  });

  it("jumps rather than slides when the gap is a teleport", () => {
    const from = { x: 120, y: 120 };
    const to = { x: 120 + TELEPORT_SNAP_DISTANCE + 1, y: 120 };

    // Sliding across the arena would draw the cursor through every wall on the way (§6.5).
    expect(interpolatePoint(from, to, 0.5)).toEqual(to);
  });

  it("still slides at exactly the threshold", () => {
    const from = { x: 0, y: 0 };
    const to = { x: TELEPORT_SNAP_DISTANCE, y: 0 };

    expect(interpolatePoint(from, to, 0.5).x).toBeCloseTo(TELEPORT_SNAP_DISTANCE / 2, 6);
  });
});

describe("frameStep", () => {
  it("measures the time between two frames", () => {
    expect(frameStep(1000, 1016)).toBe(16);
  });

  it("caps a tab that came back from the background", () => {
    expect(frameStep(1000, 40_000)).toBe(MAX_TICK_DT_MS);
  });

  it("never goes backwards", () => {
    expect(frameStep(1000, 900)).toBe(0);
  });
});
