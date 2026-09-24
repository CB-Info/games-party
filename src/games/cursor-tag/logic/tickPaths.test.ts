import { describe, expect, it } from "vitest";

import { OPEN_GROUND, chat, nearby, runner } from "./cursorTagState.fixture";
import type { Segment } from "./pathGeometry";
import { breakPaths, closePaths, currentPath, runnerPathAgainst } from "./tickPaths";

const THERE = nearby(30);

/** A path of `length` units along the open ground, starting `dx` to the right of it. */
function run(dx: number, length = 10): Segment {
  return { from: nearby(dx), to: nearby(dx + length) };
}

describe("currentPath", () => {
  it("runs from where the tick started the player to where they are", () => {
    expect(currentPath(runner("r", THERE, { tickStart: OPEN_GROUND }))).toEqual({
      from: OPEN_GROUND,
      to: THERE,
    });
  });
});

describe("closePaths", () => {
  it("starts each player's next path where they stand", () => {
    const [closed] = closePaths([runner("r", THERE, { tickStart: OPEN_GROUND })], 0);

    expect(closed?.tickStart).toEqual(THERE);
    expect(closed?.position).toEqual(THERE);
  });

  it("keeps no path at all without a rewind", () => {
    const [closed] = closePaths([runner("r", THERE, { tickStart: OPEN_GROUND })], 0);

    expect(closed?.pastPaths).toEqual([]);
  });

  it("keeps the path just run, and only as many as the rewind reaches back", () => {
    const player = runner("r", THERE, { tickStart: OPEN_GROUND, pastPaths: [run(-40), run(-20)] });

    const [closed] = closePaths([player], 2);

    expect(closed?.pastPaths).toEqual([run(-20), { from: OPEN_GROUND, to: THERE }]);
  });

  it("drops a path an event broke, and keeps the next one", () => {
    const broken = runner("r", THERE, { tickStart: OPEN_GROUND, pathBroken: true });

    const closed = closePaths([broken], 2);
    const next = closePaths(
      closed.map((player) => ({ ...player, position: nearby(60) })),
      2,
    );

    expect(closed[0]).toMatchObject({ pastPaths: [], pathBroken: false });
    expect(next[0]?.pastPaths).toEqual([{ from: THERE, to: nearby(60) }]);
  });
});

describe("breakPaths", () => {
  it("drops the paths behind the player, and marks the one under way", () => {
    expect(breakPaths(runner("r", THERE, { pastPaths: [run(0)] }))).toMatchObject({
      pastPaths: [],
      pathBroken: true,
    });
  });
});

describe("runnerPathAgainst", () => {
  const twoBack = run(0);
  const oneBack = run(10);
  const now = { tickStart: nearby(20), position: nearby(30) };

  it("is the Runner's path this tick when either player has no path to reach back to", () => {
    const withPast = runner("r", now.position, {
      tickStart: now.tickStart,
      pastPaths: [twoBack, oneBack],
    });

    expect(runnerPathAgainst(chat("c"), withPast)).toEqual(currentPath(withPast));
    expect(
      runnerPathAgainst(chat("c", OPEN_GROUND, { pastPaths: [run(90)] }), runner("r")),
    ).toEqual(currentPath(runner("r")));
  });

  it("reaches back as far as both players' paths allow", () => {
    const runnerWithPast = runner("r", now.position, { pastPaths: [twoBack, oneBack] });

    expect(
      runnerPathAgainst(chat("c", OPEN_GROUND, { pastPaths: [run(90), run(95)] }), runnerWithPast),
    ).toBe(twoBack);
    expect(
      runnerPathAgainst(chat("c", OPEN_GROUND, { pastPaths: [run(95)] }), runnerWithPast),
    ).toBe(oneBack);
  });
});
