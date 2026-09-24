import { describe, expect, it } from "vitest";

import { PREPARATION_AUTO_START_MS } from "../shared/constants";
import { isOver } from "./cursorTagState";
import { SETTINGS, chat, roundOf, runner } from "./cursorTagState.fixture";
import { endRound } from "./roundEnd";

const PLAYERS = [
  chat("c", undefined, { scoreMs: 1000, lastProcessedSeq: 4 }),
  runner("r", undefined, { scoreMs: 5000, lastProcessedSeq: 9 }),
];

const KEPT = [
  { playerId: "c", scoreMs: 1000, lastProcessedSeq: 4 },
  { playerId: "r", scoreMs: 5000, lastProcessedSeq: 9 },
];

describe("endRound", () => {
  it("goes on to the preparation of the next round, keeping scores", () => {
    const { state, events } = endRound(roundOf(PLAYERS, { round: 1 }), SETTINGS.roundCount);

    expect(events).toEqual([{ type: "roundEnd", round: 1 }]);
    expect(state).toEqual({
      phase: "preparation",
      round: 2,
      players: KEPT,
      readyIds: [],
      step: { kind: "waiting", autoStartMsLeft: PREPARATION_AUTO_START_MS },
    });
  });

  it("ends the game after the last round", () => {
    const last = roundOf(PLAYERS, { round: SETTINGS.roundCount });

    const { state, events } = endRound(last, SETTINGS.roundCount);

    expect(events).toEqual([{ type: "roundEnd", round: SETTINGS.roundCount }]);
    expect(state).toEqual({ phase: "over", players: KEPT });
    expect(isOver(state)).toBe(true);
  });
});
