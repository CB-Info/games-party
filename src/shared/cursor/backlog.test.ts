import { describe, expect, it } from "vitest";

import { ARENA_HEIGHT, ARENA_WIDTH } from "../constants";
import { moveWithBacklog } from "./backlog";
import type { Point, Wall } from "./collision";
import { moveCursor } from "./moveCursor";

const RADIUS = 14;
const MAX_SPEED = 1000;
const NOTHING: Point = { x: 0, y: 0 };

/** A wall from top to bottom, with room on both sides. */
const VERTICAL_WALL: Wall = { x: 800, y: 0, width: 40, height: ARENA_HEIGHT };

function move(overrides: Partial<Parameters<typeof moveWithBacklog>[0]>) {
  return moveWithBacklog({
    position: { x: 400, y: 450 },
    delta: NOTHING,
    backlog: NOTHING,
    budget: 33,
    maxSpeed: MAX_SPEED,
    radius: RADIUS,
    walls: [],
    catchUpMs: 300,
    ...overrides,
  });
}

describe("moveWithBacklog without a leash", () => {
  it("is exactly moveCursor, so that the mode the game has today is left untouched", () => {
    const cases = [
      { position: { x: 400, y: 450 }, delta: { x: 20, y: 5 }, budget: 33 },
      { position: { x: 400, y: 450 }, delta: { x: 300, y: -120 }, budget: 33 },
      { position: { x: 760, y: 300 }, delta: { x: 90, y: 60 }, budget: 66 },
      { position: { x: 30, y: 40 }, delta: { x: -200, y: -10 }, budget: 20 },
      { position: { x: 400, y: 450 }, delta: { x: 50, y: 0 }, budget: 0 },
    ];

    for (const { position, delta, budget } of cases) {
      const common = { position, delta, budget, maxSpeed: MAX_SPEED, radius: RADIUS };
      const today = moveCursor({ ...common, walls: [VERTICAL_WALL] });
      const kept = moveWithBacklog({
        ...common,
        walls: [VERTICAL_WALL],
        backlog: NOTHING,
        catchUpMs: 0,
      });

      expect(kept.position).toEqual(today.position);
      expect(kept.budget).toEqual(today.budget);
      expect(kept.backlog).toEqual(NOTHING);
      // What is lost is what the budget refused, as today.
      expect(kept.dropped).toBeCloseTo(Math.max(0, Math.hypot(delta.x, delta.y) - budget), 6);
    }
  });
});

describe("moveWithBacklog with a leash", () => {
  it("refuses exactly nothing when the budget covers the move", () => {
    // Not merely close to zero: a hair of refusal would count every move as a cut one.
    const result = move({ delta: { x: 12.3, y: -4.56 }, budget: 33 });

    expect(result.dropped).toBe(0);
    expect(result.backlog).toEqual({ x: 0, y: 0 });
  });

  it("keeps what the budget refused instead of throwing it away", () => {
    const result = move({ delta: { x: 100, y: 0 } });

    expect(result.position.x).toBeCloseTo(433, 6);
    expect(result.backlog.x).toBeCloseTo(67, 6);
    expect(result.dropped).toBeCloseTo(0, 6);
  });

  it("pays the remainder from the budget on the next move, with no movement of the hand", () => {
    const result = move({ backlog: { x: 60, y: 0 } });

    expect(result.position.x).toBeCloseTo(433, 6);
    expect(result.backlog.x).toBeCloseTo(27, 6);
  });

  it("never keeps more than the leash holds", () => {
    // 100 ms of travel at 1000 units a second holds a hundred units, and no more.
    const result = move({ delta: { x: 1000, y: 0 }, catchUpMs: 100 });

    expect(result.backlog.x).toBeCloseTo(100, 6);
    expect(result.dropped).toBeCloseTo(1000 - 33 - 100, 6);
  });

  it("lets a gesture back eat into the remainder first", () => {
    // Owed a hundred units to the right, the hand comes back forty: sixty are still owed.
    const result = move({ backlog: { x: 100, y: 0 }, delta: { x: -40, y: 0 }, budget: 0 });

    expect(result.backlog.x).toBeCloseTo(60, 6);
  });

  it("keeps everything and moves nothing while the budget is empty", () => {
    const result = move({ delta: { x: 50, y: 0 }, budget: 0 });

    expect(result.position).toEqual({ x: 400, y: 450 });
    expect(result.backlog.x).toBeCloseTo(50, 6);
    expect(result.dropped).toBe(0);
  });

  it("drops the part a wall stopped and keeps the part that slides along it", () => {
    // Pressed against the wall, the hand asks for a move into it and along it at once.
    const against = { x: VERTICAL_WALL.x - RADIUS - 1, y: 450 };
    const result = move({
      position: against,
      delta: { x: 100, y: -100 },
      walls: [VERTICAL_WALL],
    });

    expect(result.backlog.x).toBe(0);
    expect(result.backlog.y).toBeLessThan(0);
  });

  it("drops the part an edge of the arena stopped", () => {
    const atEdge = { x: ARENA_WIDTH - RADIUS - 1, y: 450 };
    const result = move({ position: atEdge, delta: { x: 200, y: 0 } });

    expect(result.backlog).toEqual({ x: 0, y: 0 });
  });
});
