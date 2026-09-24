import { describe, expect, it } from "vitest";

import { OPEN_GROUND, runner } from "./cursorTagState.fixture";
import { closePaths, currentPath } from "./tickPaths";

const THERE = { x: OPEN_GROUND.x + 30, y: OPEN_GROUND.y };

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
    const [closed] = closePaths([runner("r", THERE, { tickStart: OPEN_GROUND })]);

    expect(closed?.tickStart).toEqual(THERE);
    expect(closed?.position).toEqual(THERE);
  });
});
