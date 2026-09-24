import { describe, expect, it } from "vitest";

import { findPlayer } from "./cursorTagState";
import {
  REWINDING,
  REWIND_TEST_TICKS,
  SETTINGS,
  roundOf,
  rulesWith,
} from "./cursorTagState.fixture";
import { CHASE, RUN, RUNNER_START, chased, chaser, playTicks } from "./roundTick.fixture";

const TAG = { type: "tag", chatId: "c", taggedId: "r" };

describe("the rewind of a Runner's path", () => {
  it("is off without a rewind: a tag needs the tick's own paths to meet", () => {
    const { events } = playTicks(roundOf([chaser(), chased()]), CHASE, rulesWith());

    expect(events).toEqual([]);
  });

  it("lets a Chat tag the path a Runner ran TAG_REWIND_TICKS ticks back", () => {
    const round = roundOf([chaser(), chased()]);

    const before = playTicks(round, CHASE.slice(0, 2), rulesWith({ settings: REWINDING }));
    const dive = playTicks(before.state, CHASE.slice(2), rulesWith({ settings: REWINDING }));

    expect(REWIND_TEST_TICKS).toBe(2);
    expect(before.events).toEqual([]);
    expect(dive.events).toEqual([TAG]);
  });

  it("freezes the tagged Runner where they stand at the end of the tick, not where they were", () => {
    const { state } = playTicks(
      roundOf([chaser(), chased()]),
      CHASE,
      rulesWith({ settings: REWINDING }),
    );

    expect(findPlayer(state.players, "r")).toMatchObject({
      role: "chat",
      frozenMsLeft: SETTINGS.freezeMs,
      position: { x: RUNNER_START.x + 3 * RUN.x, y: RUNNER_START.y },
    });
  });

  it("reaches exactly TAG_REWIND_TICKS back, and no further", () => {
    // One more run before the dive: the path it reaches is three ticks back.
    const longer = [{ r: RUN }, ...CHASE];
    const round = roundOf([chaser(), chased()]);

    const twoBack = playTicks(round, longer, rulesWith({ settings: REWINDING }));
    const threeBack = playTicks(
      round,
      longer,
      rulesWith({ settings: { ...SETTINGS, rewindTicks: 3 } }),
    );

    expect(twoBack.events).toEqual([]);
    expect(threeBack.events).toEqual([TAG]);
  });
});
