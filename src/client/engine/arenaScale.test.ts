import { describe, expect, it } from "vitest";

import { ARENA_HEIGHT, ARENA_WIDTH } from "../../shared/constants";
import { backingSize, fitArena } from "./arenaScale";

describe("fitArena", () => {
  it("fills the width when the box is taller than 16:9", () => {
    const box = fitArena(1600, 2000);

    expect(box.width).toBe(1600);
    expect(box.height).toBe(900);
    expect(box.scale).toBe(1);
  });

  it("fills the height when the box is wider than 16:9", () => {
    const box = fitArena(4000, 450);

    expect(box.height).toBeCloseTo(450, 6);
    expect(box.width).toBeCloseTo(800, 6);
    expect(box.scale).toBeCloseTo(0.5, 6);
  });

  it("always keeps the arena's ratio", () => {
    for (const [width, height] of [
      [1004, 565],
      [930, 400],
      [1280, 1280],
      [300, 900],
    ]) {
      const box = fitArena(width ?? 0, height ?? 0);

      expect(box.width / box.height).toBeCloseTo(ARENA_WIDTH / ARENA_HEIGHT, 6);
      expect(box.width).toBeLessThanOrEqual(width ?? 0);
      expect(box.height).toBeLessThanOrEqual(height ?? 0);
    }
  });

  it("gives the scale the input conversion divides by", () => {
    const box = fitArena(800, 450);

    // Half the arena's logical width on screen: one CSS pixel of mouse is two arena units.
    expect(box.scale).toBeCloseTo(800 / ARENA_WIDTH, 6);
    expect(1 / box.scale).toBeCloseTo(2, 6);
  });

  it("survives a container with no size, before the first layout", () => {
    const box = fitArena(0, 0);

    expect(box).toEqual({ width: 0, height: 0, scale: 0 });
    expect(fitArena(-10, -10).width).toBe(0);
  });
});

describe("backingSize", () => {
  it("counts device pixels on a dense screen", () => {
    expect(backingSize(1000, 562, 2)).toEqual({ width: 2000, height: 1124, ratio: 2 });
  });

  it("changes nothing on an ordinary screen", () => {
    expect(backingSize(1000, 562, 1)).toEqual({ width: 1000, height: 562, ratio: 1 });
  });

  it("never goes below one, whatever the browser reports", () => {
    expect(backingSize(1000, 562, 0.5).ratio).toBe(1);
    expect(backingSize(1000, 562, 0).ratio).toBe(1);
  });

  it("stops at three, where a bigger buffer buys nothing", () => {
    expect(backingSize(1000, 562, 4).ratio).toBe(3);
  });

  it("gives whole pixels, since a fractional buffer is not one", () => {
    const size = backingSize(1003, 564, 1.5);

    expect(Number.isInteger(size.width)).toBe(true);
    expect(Number.isInteger(size.height)).toBe(true);
  });
});
