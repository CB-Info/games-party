import { describe, expect, it } from "vitest";

import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import { PREPARATION_AUTO_START_MS } from "../shared/constants";
import type { CursorTagAction } from "../shared/schemas";
import type { CursorTagState } from "./cursorTagState";
import {
  chat,
  countdownOf,
  member,
  roundOf,
  rulesWith,
  runner,
  waitingOf,
} from "./cursorTagState.fixture";
import { applyAction, createGame } from "./preparation";

const READY: CursorTagAction = { type: "ready" };
const NOT_READY: CursorTagAction = { type: "notReady" };

const PLAYERS = [member("a"), member("b"), member("c")];

function act(state: CursorTagState, playerId: string, action: CursorTagAction) {
  return applyAction(state, playerId, action, rulesWith());
}

describe("createGame", () => {
  it("starts with the waiting of round 1, nobody ready and no cursor", () => {
    expect(createGame(["a", "b", "c"])).toEqual({
      phase: "preparation",
      round: 1,
      players: ["a", "b", "c"].map((playerId) => ({
        playerId,
        scoreMs: 0,
        lastProcessedSeq: NO_SEQ_PROCESSED,
      })),
      readyIds: [],
      step: { kind: "waiting", autoStartMsLeft: PREPARATION_AUTO_START_MS },
    });
  });
});

describe("applyAction", () => {
  it("records a player who is ready, and tells the room", () => {
    const result = act(waitingOf(PLAYERS), "b", READY);

    expect(result).toEqual({
      ok: true,
      state: waitingOf(PLAYERS, ["b"]),
      events: [{ type: "readyChanged", playerId: "b", ready: true }],
    });
  });

  it("records a player who lost the mouse and is no longer ready, and tells the room", () => {
    const result = act(waitingOf(PLAYERS, ["a", "b"]), "a", NOT_READY);

    expect(result).toEqual({
      ok: true,
      state: waitingOf(PLAYERS, ["b"]),
      events: [{ type: "readyChanged", playerId: "a", ready: false }],
    });
  });

  it("accepts without effect a player ready twice, or not ready who was not", () => {
    const state = waitingOf(PLAYERS, ["a"]);

    expect(act(state, "a", READY)).toEqual({ ok: true, state, events: [] });
    expect(act(state, "b", NOT_READY)).toEqual({ ok: true, state, events: [] });
  });

  it("refuses both actions during the countdown, which cannot be called off", () => {
    const state = countdownOf(PLAYERS);

    expect(act(state, "a", READY)).toEqual({ ok: false, error: "INVALID_STATE" });
    expect(act(state, "a", NOT_READY)).toEqual({ ok: false, error: "INVALID_STATE" });
  });

  it("refuses both actions during a round and once the game is over", () => {
    const round = roundOf([chat("a"), runner("b"), runner("c")]);
    const over: CursorTagState = { phase: "over", players: PLAYERS };

    expect(act(round, "a", READY)).toEqual({ ok: false, error: "INVALID_STATE" });
    expect(act(over, "a", NOT_READY)).toEqual({ ok: false, error: "INVALID_STATE" });
  });

  it("refuses an action from someone who is not in the game", () => {
    expect(act(waitingOf(PLAYERS), "z", READY)).toEqual({ ok: false, error: "INVALID_STATE" });
  });
});
