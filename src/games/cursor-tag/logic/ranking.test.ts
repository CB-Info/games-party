import { describe, expect, it } from "vitest";

import { member } from "./cursorTagState.fixture";
import { displayedSeconds, finalRanking } from "./ranking";

describe("displayedSeconds", () => {
  it("rounds down to the whole second, like a stopwatch", () => {
    expect(displayedSeconds(0)).toBe(0);
    expect(displayedSeconds(42_000)).toBe(42);
    expect(displayedSeconds(42_999)).toBe(42);
    expect(displayedSeconds(43_000)).toBe(43);
  });

  it("does not lose a second to the rounding of a sum of tick lengths", () => {
    // Sixty ticks of a thirtieth of a second each: two seconds reached, a hair under them in floats.
    const summed = Array.from({ length: 60 }, () => 1000 / 30).reduce((sum, dt) => sum + dt, 0);

    expect(summed).toBeLessThan(2000);
    expect(displayedSeconds(summed)).toBe(2);
  });
});

describe("finalRanking", () => {
  it("gives the players' whole seconds, best first", () => {
    const players = [
      member("a", { scoreMs: 12_500 }),
      member("b", { scoreMs: 30_000 }),
      member("c", { scoreMs: 0 }),
    ];

    expect(finalRanking(players)).toEqual([
      { playerId: "b", score: 30 },
      { playerId: "a", score: 12 },
      { playerId: "c", score: 0 },
    ]);
  });

  it("ties two players who both see « 42 s », whatever their milliseconds", () => {
    const ranking = finalRanking([
      member("a", { scoreMs: 42_100 }),
      member("b", { scoreMs: 42_900 }),
    ]);

    expect(ranking.map((line) => line.score)).toEqual([42, 42]);
  });
});
