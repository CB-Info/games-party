import { describe, expect, it } from "vitest";

import { ARENA_WIDTH } from "../constants";
import { clearHeading, type HeadingSearch } from "./clearHeading";
import type { Wall } from "./collision";

const RADIUS = 14;
const LOOK_AHEAD = 90;
const FROM = { x: 400, y: 450 };

/** A wall from top to bottom, `gap` units to the right of the cursor. */
function wallToTheRight(gap: number): Wall {
  return { x: FROM.x + gap, y: 0, width: 40, height: 900 };
}

function search(overrides: Partial<HeadingSearch>): HeadingSearch {
  return { from: FROM, heading: 0, radius: RADIUS, walls: [], lookAhead: LOOK_AHEAD, ...overrides };
}

describe("clearHeading", () => {
  it("keeps the heading when the way is clear", () => {
    expect(clearHeading(search({ heading: 0.7 }))).toBe(0.7);
  });

  it("turns an eighth of a turn at a time, always the same way, until the way is clear", () => {
    // Straight ahead and an eighth of a turn down both run into the wall; a quarter turn does not.
    expect(clearHeading(search({ walls: [wallToTheRight(50)] }))).toBeCloseTo(Math.PI / 2);
  });

  it("checks the whole way, not only its far end", () => {
    // A thin wall halfway there: the far end is clear, the middle of the way is not. The first
    // eighth of a turn already clears it, which a search by quarter turns would skip.
    const thin: Wall = { x: FROM.x + 55, y: FROM.y - 10, width: 10, height: 20 };

    expect(clearHeading(search({ walls: [thin] }))).toBeCloseTo(Math.PI / 4);
  });

  it("counts the edges of the arena as walls", () => {
    const nearTheEdge = { x: ARENA_WIDTH - RADIUS - 20, y: 450 };

    expect(clearHeading(search({ from: nearTheEdge }))).not.toBe(0);
  });

  it("gives up when every direction is blocked", () => {
    const box: Wall[] = [
      { x: FROM.x - 60, y: FROM.y - 60, width: 120, height: 20 },
      { x: FROM.x - 60, y: FROM.y + 40, width: 120, height: 20 },
      { x: FROM.x - 60, y: FROM.y - 60, width: 20, height: 120 },
      { x: FROM.x + 40, y: FROM.y - 60, width: 20, height: 120 },
    ];

    expect(clearHeading(search({ walls: box }))).toBeNull();
  });
});
