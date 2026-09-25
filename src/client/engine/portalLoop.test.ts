import { describe, expect, it } from "vitest";

import { easeAt, parseCubicBezier, portalLoopAt, type PortalLoop } from "./portalLoop";

/** The keyword `ease` of CSS, whose midpoint is known: about 0.8024. */
const EASE = { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };

const LOOP: PortalLoop = {
  durationMs: 1600,
  curve: parseCubicBezier("cubic-bezier(0.16, 1, 0.3, 1)"),
  reducedMotion: false,
};

describe("parseCubicBezier", () => {
  it("reads the control points as the stylesheet writes them", () => {
    expect(parseCubicBezier(" cubic-bezier(0.16, 1, 0.3, 1)")).toEqual({
      x1: 0.16,
      y1: 1,
      x2: 0.3,
      y2: 1,
    });
  });

  it("reads anything it cannot make out as a linear curve", () => {
    expect(parseCubicBezier("ease-in-out")).toEqual({ x1: 0, y1: 0, x2: 1, y2: 1 });
    expect(parseCubicBezier("cubic-bezier(0.1, 1)")).toEqual({ x1: 0, y1: 0, x2: 1, y2: 1 });
  });
});

describe("easeAt", () => {
  it("starts at 0 and ends at 1, whatever the curve", () => {
    expect(easeAt(LOOP.curve, 0)).toBe(0);
    expect(easeAt(LOOP.curve, 1)).toBe(1);
  });

  it("follows a linear curve exactly", () => {
    expect(easeAt({ x1: 0, y1: 0, x2: 1, y2: 1 }, 0.3)).toBeCloseTo(0.3, 5);
  });

  it("gives the value a browser gives, at a known point of a known curve", () => {
    expect(easeAt(EASE, 0.5)).toBeCloseTo(0.8024, 3);
  });
});

describe("portalLoopAt", () => {
  it("starts again at every turn of the loop", () => {
    expect(portalLoopAt(LOOP, 0)).toBe(0);
    expect(portalLoopAt(LOOP, 800)).toBeCloseTo(portalLoopAt(LOOP, 2400) ?? -1, 9);
  });

  it("stands still when animations are reduced", () => {
    expect(portalLoopAt({ ...LOOP, reducedMotion: true }, 800)).toBeNull();
  });
});
