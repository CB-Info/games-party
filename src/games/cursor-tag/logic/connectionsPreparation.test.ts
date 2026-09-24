import { describe, expect, it } from "vitest";

import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import { disconnectPlayer, reconnectPlayer } from "./connections";
import type { PreparationState } from "./cursorTagState";
import { countdownOf, member, rulesWith, waitingOf } from "./cursorTagState.fixture";
import { applyAction } from "./preparation";

const PLAYERS = [member("a"), member("b"), member("c")];

/** A waiting halfway through its automatic start. */
function waiting(readyIds: string[]): PreparationState {
  return waitingOf(PLAYERS, readyIds, { step: { kind: "waiting", autoStartMsLeft: 12_000 } });
}

describe("connections during a preparation", () => {
  it("takes a ready player who loses their connection off the ready list, and tells the room", () => {
    const { state, events } = disconnectPlayer(
      waiting(["a", "b"]),
      "b",
      rulesWith({ away: ["b"] }),
    );

    expect(state).toEqual(waiting(["a"]));
    expect(events).toEqual([{ type: "readyChanged", playerId: "b", ready: false }]);
  });

  it("starts the countdown when the only player who is not ready loses their connection", () => {
    const { state, events } = disconnectPlayer(
      waiting(["a", "b"]),
      "c",
      rulesWith({ away: ["c"] }),
    );

    expect(state.phase === "preparation" && state.step.kind).toBe("countdown");
    expect(events).toEqual([{ type: "preparationCountdown", round: 1, auto: false }]);
  });

  it("brings a player back not ready, and waits for their click again", () => {
    // C was ready, lost the connection and came back; A and B are ready.
    const left = disconnectPlayer(waiting(["a", "c"]), "c", rulesWith({ away: ["c"] })).state;
    const back = reconnectPlayer(left, "c");
    const bReady = applyAction(back, "b", { type: "ready" }, rulesWith());
    const cReady = bReady.ok
      ? applyAction(bReady.state, "c", { type: "ready" }, rulesWith())
      : bReady;

    expect(back).toMatchObject({ readyIds: ["a"] });
    expect(bReady.ok && bReady.events).toEqual([
      { type: "readyChanged", playerId: "b", ready: true },
    ]);
    expect(cReady.ok && cReady.events).toContainEqual({
      type: "preparationCountdown",
      round: 1,
      auto: false,
    });
  });

  it("never resets the automatic start, whoever leaves or comes back", () => {
    const left = disconnectPlayer(waiting(["a"]), "b", rulesWith({ away: ["b"] })).state;
    const back = reconnectPlayer(left, "b");

    expect(back).toMatchObject({ step: { kind: "waiting", autoStartMsLeft: 12_000 } });
  });

  it("restarts the input count of a player who comes back", () => {
    const state = waitingOf([member("a", { lastProcessedSeq: 50 }), member("b"), member("c")]);

    expect(reconnectPlayer(state, "a").players[0]?.lastProcessedSeq).toBe(NO_SEQ_PROCESSED);
  });

  it("changes nothing during the countdown: a player who comes back just joins the round", () => {
    const counting = countdownOf(PLAYERS, 1500, { readyIds: ["a", "b", "c"] });

    const left = disconnectPlayer(counting, "a", rulesWith({ away: ["a"] }));

    expect(left).toEqual({ state: counting, events: [] });
    expect(reconnectPlayer(counting, "a")).toEqual(counting);
  });
});
