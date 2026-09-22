import { describe, expect, it } from "vitest";

import { ARENA_HEIGHT, ARENA_WIDTH, MOVE_BUDGET_CAP_MS } from "../constants";
import type { Wall } from "./collision";
import { moveCursor, rechargeBudget } from "./moveCursor";

const RADIUS = 14;
const MAX_SPEED = 1000;
/** Enough for any move a test asks for, so that only what is measured gets in the way. */
const FULL_BUDGET = 10000;

/** A wall from top to bottom, leaving room on both sides. */
const VERTICAL_WALL: Wall = { x: 800, y: 0, width: 40, height: ARENA_HEIGHT };

function move(
  position: { x: number; y: number },
  delta: { x: number; y: number },
  walls: readonly Wall[] = [],
  budget = FULL_BUDGET,
) {
  return moveCursor({ position, delta, budget, maxSpeed: MAX_SPEED, radius: RADIUS, walls });
}

describe("moveCursor in the open", () => {
  it("moves the whole delta when the budget allows it", () => {
    const result = move({ x: 400, y: 400 }, { x: 60, y: 80 });

    expect(result.position.x).toBeCloseTo(460, 6);
    expect(result.position.y).toBeCloseTo(480, 6);
    expect(result.budget).toBeCloseTo(FULL_BUDGET - 100, 6);
  });

  it("does nothing without a delta, and spends nothing", () => {
    const result = move({ x: 400, y: 400 }, { x: 0, y: 0 });

    expect(result.position).toEqual({ x: 400, y: 400 });
    expect(result.budget).toBe(FULL_BUDGET);
  });

  it("gives the same answer twice, which is what lets the client predict it", () => {
    const first = move({ x: 400, y: 400 }, { x: 37, y: -19 }, [VERTICAL_WALL], 55);
    const second = move({ x: 400, y: 400 }, { x: 37, y: -19 }, [VERTICAL_WALL], 55);

    expect(second).toEqual(first);
  });
});

describe("moveCursor and the budget", () => {
  it("refuses to move at all on an empty budget", () => {
    const result = move({ x: 400, y: 400 }, { x: 100, y: 0 }, [], 0);

    expect(result.position).toEqual({ x: 400, y: 400 });
    expect(result.budget).toBe(0);
  });

  it("shortens the move in the proportion the budget allows, keeping its direction", () => {
    // Length 500, budget 100: a fifth of the way, and the budget is emptied.
    const result = move({ x: 400, y: 400 }, { x: 300, y: 400 }, [], 100);

    expect(result.position.x).toBeCloseTo(460, 6);
    expect(result.position.y).toBeCloseTo(480, 6);
    expect(result.budget).toBeCloseTo(0, 6);
  });

  it("recharges with elapsed time, up to the cap", () => {
    const cap = (MAX_SPEED * MOVE_BUDGET_CAP_MS) / 1000;

    expect(rechargeBudget(0, MAX_SPEED, 100)).toBeCloseTo(100, 6);
    expect(rechargeBudget(150, MAX_SPEED, 100)).toBe(cap);
    // A cursor that stood still banks no more than the cap, so it cannot cross the arena at once.
    expect(rechargeBudget(0, MAX_SPEED, 10000)).toBe(cap);
  });
});

describe("moveCursor against a wall", () => {
  it("slides along it: the blocked axis stops, the other one carries on", () => {
    const result = move({ x: 700, y: 400 }, { x: 200, y: 200 }, [VERTICAL_WALL]);

    // X is stopped just before the wall, within one sub-step of it.
    expect(result.position.x).toBeLessThanOrEqual(VERTICAL_WALL.x - RADIUS);
    expect(result.position.x).toBeGreaterThan(VERTICAL_WALL.x - RADIUS - 8);
    // Y went the whole way: that is the slide.
    expect(result.position.y).toBeCloseTo(600, 6);
  });

  it("stops on both axes in a corner", () => {
    const corner: Wall[] = [
      { x: 800, y: 0, width: 40, height: 500 },
      { x: 600, y: 460, width: 240, height: 40 },
    ];
    const result = move({ x: 700, y: 400 }, { x: 200, y: 200 }, corner);

    expect(result.position.x).toBeLessThanOrEqual(800 - RADIUS);
    expect(result.position.y).toBeLessThanOrEqual(460 - RADIUS);
  });

  it("never jumps through a thin wall at full speed", () => {
    const thin: Wall[] = [{ x: 800, y: 0, width: 4, height: ARENA_HEIGHT }];
    const result = move({ x: 700, y: 400 }, { x: 400, y: 0 }, thin);

    // Landing on the far side would mean the move was tested only at its end point.
    expect(result.position.x).toBeLessThan(800);
  });

  it("lets a cursor leave a wall it is pressed against", () => {
    const against = { x: VERTICAL_WALL.x - RADIUS, y: 400 };
    const result = move(against, { x: -50, y: 0 }, [VERTICAL_WALL]);

    expect(result.position.x).toBeCloseTo(against.x - 50, 6);
  });
});

describe("moveCursor against the edges", () => {
  it("keeps the whole disc inside, on every side", () => {
    const left = move({ x: 100, y: 450 }, { x: -400, y: 0 });
    const right = move({ x: ARENA_WIDTH - 100, y: 450 }, { x: 400, y: 0 });
    const top = move({ x: 800, y: 100 }, { x: 0, y: -400 });
    const bottom = move({ x: 800, y: ARENA_HEIGHT - 100 }, { x: 0, y: 400 });

    expect(left.position.x).toBeGreaterThanOrEqual(RADIUS);
    expect(right.position.x).toBeLessThanOrEqual(ARENA_WIDTH - RADIUS);
    expect(top.position.y).toBeGreaterThanOrEqual(RADIUS);
    expect(bottom.position.y).toBeLessThanOrEqual(ARENA_HEIGHT - RADIUS);
  });

  it("slides along an edge instead of stopping dead", () => {
    const result = move({ x: 800, y: 100 }, { x: 200, y: -400 });

    expect(result.position.y).toBeGreaterThanOrEqual(RADIUS);
    expect(result.position.x).toBeCloseTo(1000, 6);
  });
});
