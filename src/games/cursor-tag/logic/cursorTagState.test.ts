import { describe, expect, it } from "vitest";

import { chat, member, roundOf, runner, waitingOf } from "./cursorTagState.fixture";
import { findPlayer, isOver, toMember, updatePlayer } from "./cursorTagState";

describe("updatePlayer", () => {
  it("changes the named player only, and leaves the list it was given untouched", () => {
    const players = [member("a"), member("b")];

    const updated = updatePlayer(players, "b", (player) => ({ ...player, scoreMs: 500 }));

    expect(updated.map((player) => player.scoreMs)).toEqual([0, 500]);
    expect(players.map((player) => player.scoreMs)).toEqual([0, 0]);
  });

  it("changes nothing for a player who is not in the game", () => {
    const players = [member("a")];

    expect(updatePlayer(players, "z", (player) => ({ ...player, scoreMs: 1 }))).toEqual(players);
  });
});

describe("findPlayer", () => {
  it("finds a player by identifier, and nobody for an unknown one", () => {
    const players = [member("a"), member("b", { scoreMs: 7 })];

    expect(findPlayer(players, "b")?.scoreMs).toBe(7);
    expect(findPlayer(players, "z")).toBeUndefined();
  });
});

describe("toMember", () => {
  it("keeps the score and the input count, and nothing of the round", () => {
    const player = runner("a", undefined, { scoreMs: 1200, lastProcessedSeq: 41, budget: 30 });

    expect(toMember(player)).toEqual({ playerId: "a", scoreMs: 1200, lastProcessedSeq: 41 });
  });
});

describe("isOver", () => {
  it("is true after the last round only", () => {
    expect(isOver(waitingOf([member("a")]))).toBe(false);
    expect(isOver(roundOf([chat("a"), runner("b")]))).toBe(false);
    expect(isOver({ phase: "over", players: [member("a")] })).toBe(true);
  });
});
