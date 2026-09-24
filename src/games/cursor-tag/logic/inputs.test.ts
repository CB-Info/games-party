import { describe, expect, it } from "vitest";

import { PORTAL_RADIUS } from "../shared/constants";
import { findPlayer, type RoundState } from "./cursorTagState";
import {
  OPEN_GROUND,
  chat,
  member,
  roundOf,
  rulesWith,
  runner,
  waitingOf,
} from "./cursorTagState.fixture";
import { applyInput } from "./inputs";

const STEP = { seq: 7, dx: 20, dy: 0 };

/** The player's input count and position once the input is applied to a round. */
function after(round: RoundState, playerId: string, away: string[] = []) {
  const outcome = applyInput(round, playerId, STEP, rulesWith({ away }));
  const player =
    outcome.state.phase === "round" ? findPlayer(outcome.state.players, playerId) : null;

  return { seq: player?.lastProcessedSeq, position: player?.position, events: outcome.events };
}

describe("applyInput", () => {
  it("moves a connected player during a round, and records the input", () => {
    const round = roundOf([
      chat("c", { x: 400, y: 450 }),
      runner("r", OPEN_GROUND, { budget: 60 }),
    ]);

    const { seq, position } = after(round, "r");

    expect(seq).toBe(STEP.seq);
    expect(position?.x).toBeCloseTo(OPEN_GROUND.x + STEP.dx);
  });

  it("records the input of a frozen player without moving them", () => {
    const round = roundOf([
      chat("c", OPEN_GROUND, { budget: 60, frozenMsLeft: 1 }),
      runner("r", { x: 400, y: 450 }),
    ]);

    expect(after(round, "c")).toEqual({ seq: STEP.seq, position: OPEN_GROUND, events: [] });
  });

  it("records an input that arrives after its player lost the connection, without moving them", () => {
    const round = roundOf([
      chat("c", { x: 400, y: 450 }),
      runner("r", OPEN_GROUND, { budget: 60 }),
    ]);

    expect(after(round, "r", ["r"])).toEqual({ seq: STEP.seq, position: OPEN_GROUND, events: [] });
  });

  it("ignores inputs during a preparation, but records them", () => {
    const preparation = waitingOf([member("a"), member("b")]);

    const outcome = applyInput(preparation, "a", STEP, rulesWith());

    expect(outcome.state).toEqual(
      waitingOf([member("a", { lastProcessedSeq: STEP.seq }), member("b")]),
    );
    expect(outcome.events).toEqual([]);
  });

  it("sends a player through a portal their input enters", () => {
    const nearA = { x: 120 + PORTAL_RADIUS + 10, y: 120 };
    const round = roundOf([chat("c"), runner("r", nearA, { budget: 60 })]);

    const outcome = applyInput(round, "r", { seq: 0, dx: -30, dy: 0 }, rulesWith());

    expect(outcome.events).toEqual([{ type: "portal", playerId: "r", pair: "A" }]);
  });

  it("changes nothing for an input from someone who is not in the game", () => {
    const round = roundOf([chat("c"), runner("r")]);

    expect(applyInput(round, "z", STEP, rulesWith())).toEqual({ state: round, events: [] });
  });
});
