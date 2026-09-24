import { describe, expect, it } from "vitest";

import { budgetCap } from "../../../shared/cursor/moveCursor";
import { PORTAL_RADIUS } from "../shared/constants";
import { findPlayer, type CursorTagState, type RoundState } from "./cursorTagState";
import {
  SETTINGS,
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
import { applyInput } from "./inputs";
import { maxSpeedOf } from "./movement";
import { displayedSeconds } from "./ranking";
import { startRound } from "./roundStart";
import { playRoundTick } from "./roundTick";

/** Portal A, and a spot just outside its first circle (rules.md, §6.5). */
const A_FIRST = { x: 120, y: 120 };
const A_SECOND = { x: 1480, y: 780 };
const NEAR_A = { x: A_FIRST.x + PORTAL_RADIUS + 10, y: A_FIRST.y };

function tick(state: RoundState) {
  return playRoundTick(state, TICK_MS, rulesWith());
}

describe("playRoundTick", () => {
  it("tags a Runner the Chat meets, and recharges only the player who is not frozen", () => {
    const { state, events } = tick(roundOf([chat("c", nearby(0)), runner("r", nearby(20))]));
    const round = asRound(state);

    expect(events).toEqual([{ type: "tag", chatId: "c", taggedId: "r" }]);
    expect(findPlayer(round.players, "r")).toMatchObject({ role: "chat", budget: 0 });
    expect(findPlayer(round.players, "c")?.budget).toBeCloseTo(
      (maxSpeedOf("runner") * TICK_MS) / 1000,
    );
  });

  it("does not count a contact on the path a Runner ran before a portal", () => {
    // The Chat stands by the way into portal A: the Runner comes within reach of it on their way
    // in, but only their path from the far portal counts.
    const round = roundOf([chat("c", { x: 150, y: 140 }), runner("r", NEAR_A, { budget: 60 })]);
    const moved = asRound(applyInput(round, "r", { seq: 0, dx: -30, dy: 0 }, rulesWith()).state);

    const { state, events } = tick(moved);

    expect(events).toEqual([]);
    expect(findPlayer(asRound(state).players, "r")?.role).toBe("runner");
  });

  it("lets a Chat waiting at a portal's exit tag the Runner coming out of it", () => {
    const round = roundOf([
      chat("c", { x: A_SECOND.x - 20, y: A_SECOND.y }),
      runner("r", NEAR_A, { budget: 60 }),
    ]);
    const moved = applyInput(round, "r", { seq: 0, dx: -30, dy: 0 }, rulesWith());

    const { events } = tick(asRound(moved.state));

    expect([...moved.events, ...events]).toEqual([
      { type: "portal", playerId: "r", pair: "A" },
      { type: "tag", chatId: "c", taggedId: "r" },
    ]);
  });

  it("lets a new Chat tag the old one the tick their freeze ends: no protection after a tag", () => {
    const round = roundOf([
      chat("new", nearby(0), { frozenMsLeft: TICK_MS }),
      runner("old", nearby(20)),
    ]);

    expect(tick(round).events).toEqual([{ type: "tag", chatId: "new", taggedId: "old" }]);
  });

  it("starts each path where the previous tick left the player", () => {
    // The Runner dashes past a frozen Chat during the first tick. The Chat is free the next tick,
    // when the Runner stands still well out of reach: their old path must not count again.
    const round = roundOf([
      chat("c", nearby(0), { frozenMsLeft: TICK_MS * 1.5 }),
      runner("r", nearby(60), { tickStart: nearby(-60) }),
    ]);

    const first = tick(round);
    const second = tick(asRound(first.state));

    expect([...first.events, ...second.events]).toEqual([]);
  });

  it("scores a connected Runner the length of the tick", () => {
    const { state } = tick(roundOf([chat("c", nearby(-200)), runner("r", nearby(200))]));

    expect(findPlayer(asRound(state).players, "r")?.scoreMs).toBeCloseTo(TICK_MS);
  });

  it("scores only what was left of the round on its last tick, then ends it", () => {
    const last = roundOf([chat("c", nearby(-200)), runner("r", nearby(200))], { timeLeftMs: 10 });

    const { state, events } = tick(last);

    expect(events).toEqual([{ type: "roundEnd", round: 1 }]);
    expect(state.phase).toBe("preparation");
    expect(findPlayer(state.players, "r")?.scoreMs).toBe(10);
  });

  it("lasts the round length the host set, which a Runner never tagged scores in full", () => {
    // Three players on their spawn points, nobody moving: nobody is ever within reach.
    const preparation = waitingOf([member("a"), member("b"), member("c")]);
    let state: CursorTagState = startRound(preparation, rulesWith({ random: () => 0.5 })).state;
    let ticks = 0;

    // Bounded, so that a round that never ends fails the test instead of hanging it.
    while (state.phase === "round" && ticks <= SETTINGS.roundMs) {
      state = tick(state).state;
      ticks += 1;
    }

    expect(ticks).toBe(Math.ceil(SETTINGS.roundMs / TICK_MS));
    const scores = state.players.map((player) => player.scoreMs).filter((score) => score > 0);
    expect(scores).toHaveLength(2);
    for (const score of scores) {
      expect(score).toBeCloseTo(SETTINGS.roundMs, 6);
      expect(displayedSeconds(score)).toBe(SETTINGS.roundMs / 1000);
    }
  });

  it("recharges a Chat who has just become a Runner no further than a Runner's reserve", () => {
    const round = roundOf([
      chat("c", nearby(0), { budget: budgetCap(maxSpeedOf("chat")) }),
      runner("r", nearby(20)),
    ]);

    const { state } = tick(round);

    expect(findPlayer(asRound(state).players, "c")?.budget).toBeCloseTo(
      budgetCap(maxSpeedOf("runner")),
    );
  });
});
