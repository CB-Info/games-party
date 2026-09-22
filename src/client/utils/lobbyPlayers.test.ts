import { describe, expect, it } from "vitest";

import type { Player } from "../../shared/types";
import { countReady, countableForReady, orderLobbyPlayers } from "./lobbyPlayers";

function player(overrides: Partial<Player> & Pick<Player, "playerId">): Player {
  return {
    pseudo: overrides.playerId,
    color: "c1",
    isHost: false,
    isBot: false,
    connected: true,
    isSpectator: false,
    ...overrides,
  };
}

describe("orderLobbyPlayers", () => {
  it("puts the host first and keeps the arrival order behind", () => {
    const players = [
      player({ playerId: "a" }),
      player({ playerId: "b" }),
      player({ playerId: "c" }),
    ];

    expect(orderLobbyPlayers(players, "b").map((p) => p.playerId)).toEqual(["b", "a", "c"]);
  });

  it("leaves the order untouched when the host is already first", () => {
    const players = [player({ playerId: "a" }), player({ playerId: "b" })];

    expect(orderLobbyPlayers(players, "a").map((p) => p.playerId)).toEqual(["a", "b"]);
  });

  it("keeps everyone when the room has no host", () => {
    const players = [player({ playerId: "a" }), player({ playerId: "b" })];

    expect(orderLobbyPlayers(players, null).map((p) => p.playerId)).toEqual(["a", "b"]);
  });

  it("handles an empty room", () => {
    expect(orderLobbyPlayers([], null)).toEqual([]);
  });
});

describe("countableForReady", () => {
  it("leaves out the host, who agrees by starting", () => {
    const players = [player({ playerId: "host" }), player({ playerId: "guest" })];

    expect(countableForReady(players, "host").map((p) => p.playerId)).toEqual(["guest"]);
  });

  it("leaves out a disconnected player, who never blocks a launch", () => {
    const players = [
      player({ playerId: "host" }),
      player({ playerId: "away", connected: false }),
      player({ playerId: "guest" }),
    ];

    expect(countableForReady(players, "host").map((p) => p.playerId)).toEqual(["guest"]);
  });

  it("leaves out a spectator, who is not in the game", () => {
    const players = [
      player({ playerId: "host" }),
      player({ playerId: "watcher", isSpectator: true }),
    ];

    expect(countableForReady(players, "host")).toEqual([]);
  });
});

describe("countReady", () => {
  it("counts only the ready players among those who count", () => {
    const players = [
      player({ playerId: "host" }),
      player({ playerId: "a" }),
      player({ playerId: "b" }),
      player({ playerId: "away", connected: false }),
    ];

    expect(countReady(players, "host", ["a", "away"])).toEqual({ ready: 1, total: 2 });
  });

  it("reports nobody when the host is alone", () => {
    expect(countReady([player({ playerId: "host" })], "host", [])).toEqual({ ready: 0, total: 0 });
  });
});
