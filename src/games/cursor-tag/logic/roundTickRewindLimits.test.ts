import { describe, expect, it } from "vitest";

import { budgetCap } from "../../../shared/cursor/moveCursor";
import { disconnectPlayer, reconnectPlayer } from "./connections";
import {
  REWINDING,
  TICK_MS,
  asRound,
  chat,
  nearby,
  roundOf,
  rulesWith,
  runner,
} from "./cursorTagState.fixture";
import { maxSpeedOf } from "./movement";
import { CHASE, CHASER_WAIT, DIVE, RUN, chased, chaser, playTicks } from "./roundTick.fixture";

/**
 * Each case is the chase of `roundTick.fixture.ts`, which ends in a tag two ticks back, with one
 * event in the way: the rewind must not reach back past it (rules.md, §6.3).
 */
const rules = rulesWith({ settings: REWINDING });

describe("the rewind stops at", () => {
  it("a teleport of the Runner", () => {
    // The Runner runs left beside portal A, then into it on the second tick; the Chat dives to
    // where they ran on the first.
    const round = roundOf([
      chat("c", { x: 185, y: 175 }, { budget: budgetCap(maxSpeedOf("chat")) }),
      runner("r", { x: 200, y: 120 }, { budget: budgetCap(maxSpeedOf("runner")) }),
    ]);
    const left = { x: -RUN.x, y: 0 };

    const { events } = playTicks(round, [{ r: left }, { r: left }, { c: DIVE }], rules);

    expect(events).toEqual([{ type: "portal", playerId: "r", pair: "A" }]);
  });

  it("a role change of the Runner", () => {
    // The Runner is a Chat on the first tick, and tags T on their way.
    const round = roundOf([chaser(), chased({ role: "chat" }), runner("t", nearby(110))]);

    const { events } = playTicks(round, CHASE, rules);

    expect(events).toEqual([{ type: "tag", chatId: "r", taggedId: "t" }]);
  });

  it("a role change of the Chat, who has just replaced a Chat who left", () => {
    // N waits where the Chat of the chase waits, as a Runner, until X leaves after the second tick.
    const round = roundOf([
      chat("x", nearby(-150, -100)),
      runner("n", CHASER_WAIT, { budget: budgetCap(maxSpeedOf("chat")) }),
      chased(),
      runner("s", nearby(-150, 100)),
    ]);
    const away = rulesWith({ settings: REWINDING, away: ["x"], random: () => 0 });

    const before = playTicks(round, CHASE.slice(0, 2), rules);
    const replaced = disconnectPlayer(before.state, "x", away);
    const dive = playTicks(asRound(replaced.state), [{ r: RUN, n: DIVE }], away);

    expect(replaced.events).toEqual([
      { type: "chatReplaced", previousChatId: "x", newChatId: "n" },
    ]);
    expect(dive.events).toEqual([]);
  });

  it("the end of the Chat's freeze", () => {
    // Frozen for a tick and a half: free from the second tick on.
    const round = roundOf([chaser({ frozenMsLeft: TICK_MS * 1.5 }), chased()]);

    expect(playTicks(round, CHASE, rules).events).toEqual([]);
  });

  it("a reconnection of the Runner, after a disconnection or by a takeover", () => {
    const round = roundOf([chaser(), chased()]);
    const before = playTicks(round, CHASE.slice(0, 2), rules).state;

    const returned = reconnectPlayer(
      disconnectPlayer(before, "r", rulesWith({ away: ["r"] })).state,
      "r",
    );
    const takenOver = reconnectPlayer(before, "r");

    expect(playTicks(asRound(returned), CHASE.slice(2), rules).events).toEqual([]);
    expect(playTicks(asRound(takenOver), CHASE.slice(2), rules).events).toEqual([]);
  });
});
