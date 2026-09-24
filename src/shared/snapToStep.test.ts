import { describe, expect, it } from "vitest";

import { snapToStep } from "./snapToStep";

/** Cursor Tag's round duration: 30 to 120 s, in steps of 15 (its rules.md, §3). */
const ROUND = { min: 30, max: 120, step: 15 };

function round(value: number): number {
  return snapToStep(value, ROUND.min, ROUND.max, ROUND.step);
}

describe("snapToStep", () => {
  it("keeps a value that is on a step and inside the bounds", () => {
    expect(round(75)).toBe(75);
  });

  it("brings a value below the lower bound up to it", () => {
    expect(round(10)).toBe(ROUND.min);
  });

  it("brings a value above the upper bound down to it", () => {
    expect(round(500)).toBe(ROUND.max);
  });

  it("brings a value off its step to the nearest one", () => {
    // The two examples of Cursor Tag's rules.md: 70 s becomes 75, 67 s becomes 60.
    expect(round(70)).toBe(75);
    expect(round(67)).toBe(60);
  });

  it("sends a value halfway between two steps to the lower one", () => {
    expect(snapToStep(1500, 1000, 8000, 1000)).toBe(1000);
    expect(snapToStep(50, 0, 500, 100)).toBe(0);
  });
});
