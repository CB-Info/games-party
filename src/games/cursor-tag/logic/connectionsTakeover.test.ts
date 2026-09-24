import { describe, expect, it } from "vitest";

import { NO_SEQ_PROCESSED, isNewInput } from "../../../shared/cursor/cursorInput";
import { reconnectPlayer } from "./connections";
import { findPlayer } from "./cursorTagState";
import {
  TICK_MS,
  asRound,
  chat,
  member,
  nearby,
  roundOf,
  rulesWith,
  runner,
  waitingOf,
} from "./cursorTagState.fixture";
import { playRoundTick } from "./roundTick";

/**
 * A seat taken over by another tab, or by a reconnection the server heard of before the old
 * socket's end (rules.md, §11): the game hears of a reconnection with no disconnection before it.
 */
describe("a seat taken over without a disconnection", () => {
  it("restarts the input count, so that the new tab's first input is applied", () => {
    const round = roundOf([
      chat("c", nearby(0), { lastProcessedSeq: 120 }),
      runner("r", nearby(200)),
    ]);

    const taken = findPlayer(asRound(reconnectPlayer(round, "c")).players, "c");

    expect(taken?.lastProcessedSeq).toBe(NO_SEQ_PROCESSED);
    expect(isNewInput({ seq: 0, dx: 1, dy: 0 }, taken?.lastProcessedSeq ?? 0)).toBe(true);
  });

  it("drops what the old tab had in hand and owed", () => {
    const round = roundOf([
      chat("c", nearby(-200)),
      runner("r", nearby(0), { budget: 40, backlog: { x: 12, y: 0 } }),
    ]);

    expect(findPlayer(asRound(reconnectPlayer(round, "r")).players, "r")).toMatchObject({
      budget: 0,
      backlog: { x: 0, y: 0 },
    });
  });

  it("leaves a Chat a Chat, still able to tag: reopening a tab is no way out", () => {
    const round = roundOf([
      chat("c", nearby(0)),
      runner("r", nearby(20)),
      runner("s", nearby(200)),
    ]);

    const taken = asRound(reconnectPlayer(round, "c"));

    expect(playRoundTick(taken, TICK_MS, rulesWith()).events).toEqual([
      { type: "tag", chatId: "c", taggedId: "r" },
    ]);
  });

  it("goes on scoring a Runner: reopening a tab is no pause", () => {
    const round = roundOf([chat("c", nearby(-200)), runner("r", nearby(0), { scoreMs: 500 })]);

    const ticked = playRoundTick(asRound(reconnectPlayer(round, "r")), TICK_MS, rulesWith());

    expect(findPlayer(asRound(ticked.state).players, "r")?.scoreMs).toBeCloseTo(500 + TICK_MS);
  });

  it("keeps a ready player ready during the waiting", () => {
    const waiting = waitingOf([member("a"), member("b"), member("c")], ["a"]);

    expect(reconnectPlayer(waiting, "a")).toMatchObject({ readyIds: ["a"] });
  });
});
