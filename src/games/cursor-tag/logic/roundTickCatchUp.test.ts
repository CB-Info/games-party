import { describe, expect, it } from "vitest";

import { budgetCap } from "../../../shared/cursor/moveCursor";
import { PORTAL_RADIUS } from "../shared/constants";
import { findPlayer, type RoundState } from "./cursorTagState";
import {
  CATCHING_UP,
  CATCH_UP_TEST_MS,
  TICK_MS,
  asRound,
  chat,
  nearby,
  roundOf,
  rulesWith,
  runner,
} from "./cursorTagState.fixture";
import { applyInput } from "./inputs";
import { maxSpeedOf } from "./movement";
import { playRoundTick } from "./roundTick";

/** A tick of a game played with the tests' catch-up leash. */
function tick(state: RoundState) {
  return playRoundTick(state, TICK_MS, rulesWith({ settings: CATCHING_UP }));
}

function playerOf(state: RoundState, playerId: string) {
  return findPlayer(state.players, playerId);
}

describe("the catch-up during a round's tick", () => {
  it("never builds a remainder without catch-up: what the budget refuses is lost", () => {
    const round = roundOf([chat("c", nearby(-200)), runner("r", nearby(0), { budget: 20 })]);

    const moved = asRound(applyInput(round, "r", { seq: 0, dx: 100, dy: 0 }, rulesWith()).state);
    const ticked = asRound(playRoundTick(moved, TICK_MS, rulesWith()).state);

    expect(playerOf(ticked, "r")?.backlog).toEqual({ x: 0, y: 0 });
    expect(playerOf(ticked, "r")?.position.x).toBeCloseTo(nearby(20).x);
  });

  it("pays a remainder before the recharge, so never more than one reserve in a tick", () => {
    const reserve = budgetCap(maxSpeedOf("runner"));
    const round = roundOf([
      chat("c", nearby(-200)),
      runner("r", nearby(-100), { budget: reserve, backlog: { x: 3 * reserve, y: 0 } }),
    ]);

    const after = playerOf(asRound(tick(round).state), "r");

    expect(after?.position.x).toBeCloseTo(nearby(-100 + reserve).x);
    expect(after?.budget).toBeCloseTo((maxSpeedOf("runner") * TICK_MS) / 1000);
  });

  it("lets a Chat tag a Runner on the way their remainder takes them this tick", () => {
    const round = roundOf([
      chat("c", nearby(0)),
      runner("r", nearby(60), { budget: 40, backlog: { x: -40, y: 0 } }),
    ]);

    expect(tick(round).events).toEqual([{ type: "tag", chatId: "c", taggedId: "r" }]);
  });

  it("carries a Runner through the portal their remainder enters, where a Chat can tag them", () => {
    const aSecond = { x: 1480, y: 780 };
    const round = roundOf([
      chat("c", { x: aSecond.x - 20, y: aSecond.y }),
      runner(
        "r",
        { x: 120 + PORTAL_RADIUS + 10, y: 120 },
        { budget: 30, backlog: { x: -30, y: 0 } },
      ),
    ]);

    const { state, events } = tick(round);

    expect(events).toEqual([
      { type: "portal", playerId: "r", pair: "A" },
      { type: "tag", chatId: "c", taggedId: "r" },
    ]);
    expect(playerOf(asRound(state), "r")?.backlog).toEqual({ x: 0, y: 0 });
  });

  it("drops the remainder of the Runner a Chat tags", () => {
    const round = roundOf([
      chat("c", nearby(0)),
      runner("r", nearby(20), { backlog: { x: 5, y: 5 } }),
    ]);

    expect(playerOf(asRound(tick(round).state), "r")).toMatchObject({
      role: "chat",
      backlog: { x: 0, y: 0 },
    });
  });

  it("keeps the remainder of a Chat who tags, and cuts it to a Runner's leash the next tick", () => {
    const chatLeash = (maxSpeedOf("chat") * CATCH_UP_TEST_MS) / 1000;
    const runnerLeash = (maxSpeedOf("runner") * CATCH_UP_TEST_MS) / 1000;
    const round = roundOf([
      chat("c", nearby(0), { backlog: { x: -chatLeash, y: 0 } }),
      runner("r", nearby(20)),
    ]);

    const first = asRound(tick(round).state);
    const second = asRound(tick(first).state);

    expect(playerOf(first, "c")).toMatchObject({
      role: "runner",
      backlog: { x: -chatLeash, y: 0 },
    });
    expect(playerOf(second, "c")?.backlog.x).toBeCloseTo(-runnerLeash);
  });
});
