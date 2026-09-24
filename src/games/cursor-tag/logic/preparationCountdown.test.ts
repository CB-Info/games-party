import { describe, expect, it } from "vitest";

import { PREPARATION_AUTO_START_MS, PREPARATION_COUNTDOWN_MS } from "../shared/constants";
import type { PreparationState } from "./cursorTagState";
import { SETTINGS, countdownOf, member, rulesWith, waitingOf } from "./cursorTagState.fixture";
import { applyAction, startCountdownIfAllReady, tickPreparation } from "./preparation";

const PLAYERS = [member("a"), member("b"), member("c")];

/** The countdown's first state: the waiting's players and ready list, counting down in full. */
function countingDown(from: PreparationState): PreparationState {
  return { ...from, step: { kind: "countdown", countdownMsLeft: PREPARATION_COUNTDOWN_MS } };
}

describe("the countdown of a preparation", () => {
  it("starts when the last connected player becomes ready", () => {
    const result = applyAction(waitingOf(PLAYERS, ["a", "c"]), "b", { type: "ready" }, rulesWith());

    expect(result).toEqual({
      ok: true,
      state: countingDown(waitingOf(PLAYERS, ["a", "c", "b"])),
      events: [
        { type: "readyChanged", playerId: "b", ready: true },
        { type: "preparationCountdown", round: 1, auto: false },
      ],
    });
  });

  it("does not start while a connected player is not ready", () => {
    const state = waitingOf(PLAYERS, ["a"]);

    expect(startCountdownIfAllReady(state, rulesWith())).toEqual({ state, events: [] });
  });

  it("starts when the only player who is not ready is away", () => {
    const state = waitingOf(PLAYERS, ["a", "b"]);

    expect(startCountdownIfAllReady(state, rulesWith({ away: ["c"] }))).toEqual({
      state: countingDown(state),
      events: [{ type: "preparationCountdown", round: 1, auto: false }],
    });
  });

  it("does not start when nobody is connected", () => {
    const state = waitingOf(PLAYERS);

    expect(startCountdownIfAllReady(state, rulesWith({ away: ["a", "b", "c"] }))).toEqual({
      state,
      events: [],
    });
  });

  it("does not start again once it has started", () => {
    const state = countdownOf(PLAYERS, 1000, { readyIds: ["a", "b", "c"] });

    expect(startCountdownIfAllReady(state, rulesWith())).toEqual({ state, events: [] });
  });
});

describe("tickPreparation", () => {
  it("runs the automatic start down while players are waiting", () => {
    const { state, events } = tickPreparation(waitingOf(PLAYERS), 500, rulesWith());

    expect(state).toEqual(
      waitingOf(PLAYERS, [], {
        step: { kind: "waiting", autoStartMsLeft: PREPARATION_AUTO_START_MS - 500 },
      }),
    );
    expect(events).toEqual([]);
  });

  it("starts the countdown by itself when the automatic start runs out", () => {
    const almost = waitingOf(PLAYERS, ["a"], { step: { kind: "waiting", autoStartMsLeft: 20 } });

    expect(tickPreparation(almost, 33, rulesWith())).toEqual({
      state: countingDown(almost),
      events: [{ type: "preparationCountdown", round: 1, auto: true }],
    });
  });

  it("runs the countdown down", () => {
    const { state } = tickPreparation(countdownOf(PLAYERS), 500, rulesWith());

    expect(state).toEqual(countdownOf(PLAYERS, PREPARATION_COUNTDOWN_MS - 500));
  });

  it("starts the round at the end of the countdown, with its Chats frozen", () => {
    const secondRound = countdownOf(PLAYERS, 10, { round: 2 });

    const { state, events } = tickPreparation(secondRound, 33, rulesWith({ random: () => 0.5 }));

    expect(state.phase).toBe("round");
    expect(events).toEqual([expect.objectContaining({ type: "roundStart", round: 2 })]);
    if (state.phase === "round") {
      const chats = state.players.filter((player) => player.role === "chat");
      expect(chats).toHaveLength(SETTINGS.chatCount);
      expect(chats.every((player) => player.frozenMsLeft === SETTINGS.freezeMs)).toBe(true);
    }
  });
});
