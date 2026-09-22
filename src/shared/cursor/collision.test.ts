import { describe, expect, it } from "vitest";

import { ARENA_HEIGHT, ARENA_WIDTH } from "../constants";
import { distance, isOutsideArena, overlapsAnyWall, overlapsWall, type Wall } from "./collision";

const WALL: Wall = { x: 100, y: 100, width: 200, height: 50 };
const RADIUS = 14;

describe("overlapsWall", () => {
  it("sees a cursor sitting inside the wall", () => {
    expect(overlapsWall({ x: 200, y: 120 }, RADIUS, WALL)).toBe(true);
  });

  it("leaves a cursor that only touches the wall alone", () => {
    // Exactly `radius` away from the top edge: §6.5 makes the comparison strict, so grazing a wall
    // is allowed and a cursor can slide along it.
    expect(overlapsWall({ x: 200, y: 100 - RADIUS }, RADIUS, WALL)).toBe(false);
    expect(overlapsWall({ x: 200, y: 100 - RADIUS + 0.01 }, RADIUS, WALL)).toBe(true);
  });

  it("checks the four sides", () => {
    expect(overlapsWall({ x: 200, y: 100 - RADIUS + 1 }, RADIUS, WALL)).toBe(true);
    expect(overlapsWall({ x: 200, y: 150 + RADIUS - 1 }, RADIUS, WALL)).toBe(true);
    expect(overlapsWall({ x: 100 - RADIUS + 1, y: 120 }, RADIUS, WALL)).toBe(true);
    expect(overlapsWall({ x: 300 + RADIUS - 1, y: 120 }, RADIUS, WALL)).toBe(true);
  });

  it("checks the four corners, where the nearest point is not on a side", () => {
    const corners = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 100, y: 150 },
      { x: 300, y: 150 },
    ];

    for (const corner of corners) {
      // A disc whose centre sits one unit away from the corner, diagonally outside.
      const outward = {
        x: corner.x + (corner.x === 100 ? -1 : 1) * (RADIUS - 1),
        y: corner.y + (corner.y === 100 ? -1 : 1) * (RADIUS - 1),
      };

      // Far enough diagonally not to overlap, though each axis alone would suggest it does.
      expect(overlapsWall(outward, RADIUS, WALL)).toBe(false);
    }
  });

  it("finds a wall among several", () => {
    const others: Wall[] = [{ x: 900, y: 10, width: 10, height: 10 }, WALL];

    expect(overlapsAnyWall({ x: 200, y: 120 }, RADIUS, others)).toBe(true);
    expect(overlapsAnyWall({ x: 700, y: 700 }, RADIUS, others)).toBe(false);
  });
});

describe("isOutsideArena", () => {
  it("keeps the whole disc inside", () => {
    expect(isOutsideArena({ x: RADIUS, y: RADIUS }, RADIUS)).toBe(false);
    expect(isOutsideArena({ x: RADIUS - 0.01, y: RADIUS }, RADIUS)).toBe(true);
    expect(isOutsideArena({ x: RADIUS, y: RADIUS - 0.01 }, RADIUS)).toBe(true);
  });

  it("does the same on the far side", () => {
    const corner = { x: ARENA_WIDTH - RADIUS, y: ARENA_HEIGHT - RADIUS };

    expect(isOutsideArena(corner, RADIUS)).toBe(false);
    expect(isOutsideArena({ ...corner, x: corner.x + 0.01 }, RADIUS)).toBe(true);
    expect(isOutsideArena({ ...corner, y: corner.y + 0.01 }, RADIUS)).toBe(true);
  });
});

describe("distance", () => {
  it("measures between two points", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
