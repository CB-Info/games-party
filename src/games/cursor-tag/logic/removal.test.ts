import { describe, expect, it } from "vitest";

import { MIN_PLAYERS } from "../shared/constants";
import { disconnectPlayer } from "./connections";
import { findPlayer, type RoundPlayer } from "./cursorTagState";
import {
  SETTINGS,
  chat,
  member,
  nearby,
  neverDrawn,
  roundOf,
  rulesWith,
  runner,
  waitingOf,
} from "./cursorTagState.fixture";
import { removePlayer } from "./removal";

const TWO_CHATS = { ...SETTINGS, chatCount: 2 };

/** Players standing apart, so that no tick of these tests tags anyone. */
function apart(...players: Array<(at: ReturnType<typeof nearby>) => RoundPlayer>): RoundPlayer[] {
  return players.map((make, index) => make(nearby(-150 + index * 60)));
}

describe("removePlayer", () => {
  it("does nothing more below MIN_PLAYERS: no replacement, no end of round, no countdown", () => {
    const round = roundOf(
      apart(
        (at) => chat("a", at),
        (at) => runner("b", at),
        (at) => runner("c", at),
      ),
    );
    const waiting = waitingOf([member("a"), member("b"), member("c")], ["b", "c"]);

    const fromRound = removePlayer(round, "a", rulesWith({ random: neverDrawn }));
    const lastRunner = removePlayer(removePlayer(round, "b", rulesWith()).state, "c", rulesWith());
    const fromWaiting = removePlayer(waiting, "a", rulesWith());

    expect(round.players.length - 1).toBeLessThan(MIN_PLAYERS);
    expect(fromRound.events).toEqual([]);
    expect(lastRunner.events).toEqual([]);
    expect(fromWaiting).toEqual({
      state: waitingOf([member("b"), member("c")], ["b", "c"]),
      events: [],
    });
  });

  it("replaces a removed Chat by the same rule as a disconnected one", () => {
    const round = roundOf(
      apart(
        (at) => chat("a", at),
        (at) => chat("b", at),
        (at) => runner("c", at),
        (at) => runner("d", at),
        (at) => runner("e", at),
      ),
    );
    const rules = rulesWith({ settings: TWO_CHATS, random: () => 0 });

    const { state, events } = removePlayer(round, "a", rules);

    expect(events).toEqual([{ type: "chatReplaced", previousChatId: "a", newChatId: "c" }]);
    expect(findPlayer(state.players, "a")).toBeUndefined();
  });

  it("replaces a Chat left away unreplaced once they are removed (§11, fourth example)", () => {
    // A lost the connection with too few players connected to replace them.
    const round = roundOf(
      apart(
        (at) => chat("a", at),
        (at) => chat("b", at),
        (at) => runner("c", at),
        (at) => runner("d", at),
        (at) => runner("e", at),
      ),
    );
    const left = disconnectPlayer(
      round,
      "a",
      rulesWith({ settings: TWO_CHATS, away: ["a", "d", "e"] }),
    );

    const removed = removePlayer(
      left.state,
      "a",
      rulesWith({ settings: TWO_CHATS, random: () => 0 }),
    );

    expect(left.events).toEqual([]);
    expect(removed.events).toEqual([{ type: "chatReplaced", previousChatId: "a", newChatId: "c" }]);
  });

  it("ends the round at once when no Runner is left, then prepares the next one", () => {
    const round = roundOf(
      apart(
        (at) => chat("a", at),
        (at) => chat("b", at),
        (at) => chat("c", at),
        (at) => runner("d", at),
      ),
    );

    const { state, events } = removePlayer(round, "d", rulesWith());

    expect(events).toEqual([{ type: "roundEnd", round: 1 }]);
    expect(state).toMatchObject({ phase: "preparation", round: 2 });
  });

  it("ends the game when the last round is left without a Runner", () => {
    const round = roundOf(
      apart(
        (at) => chat("a", at),
        (at) => chat("b", at),
        (at) => chat("c", at),
        (at) => runner("d", at),
      ),
      { round: SETTINGS.roundCount },
    );

    expect(removePlayer(round, "d", rulesWith()).state.phase).toBe("over");
  });

  it("takes a ready player off the ready list with no event, and counts down if the rest are ready", () => {
    const players = [member("a"), member("b"), member("c"), member("d")];

    const { state, events } = removePlayer(waitingOf(players, ["a", "b", "c"]), "d", rulesWith());
    const readyLeft = removePlayer(waitingOf(players, ["a", "d"]), "d", rulesWith());

    expect(events).toEqual([{ type: "preparationCountdown", round: 1, auto: false }]);
    expect(state).toMatchObject({ readyIds: ["a", "b", "c"], step: { kind: "countdown" } });
    expect(readyLeft).toEqual({ state: waitingOf(players.slice(0, 3), ["a"]), events: [] });
  });

  it("takes a player out of the ranking once the game is over", () => {
    const over = { phase: "over" as const, players: [member("a"), member("b"), member("c")] };

    expect(removePlayer(over, "b", rulesWith()).state.players.map((p) => p.playerId)).toEqual([
      "a",
      "c",
    ]);
  });

  it("changes nothing for someone who is not in the game", () => {
    const round = roundOf(
      apart(
        (at) => chat("a", at),
        (at) => runner("b", at),
      ),
    );

    expect(removePlayer(round, "z", rulesWith())).toEqual({ state: round, events: [] });
  });
});
