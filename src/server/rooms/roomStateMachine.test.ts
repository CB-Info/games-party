import { describe, expect, it } from "vitest";

import type { PlayerColorId } from "../../shared/types";
import type { RoomMember } from "./roomMember";
import { canTransition, checkStartConditions, type StartConditions } from "./roomStateMachine";

function member(overrides: Partial<RoomMember> & Pick<RoomMember, "playerId">): RoomMember {
  return {
    sessionToken: `token-${overrides.playerId}`,
    pseudo: overrides.playerId,
    color: "c1" as PlayerColorId,
    isBot: false,
    connected: true,
    isSpectator: false,
    ready: false,
    points: 0,
    joinedAt: 0,
    ...overrides,
  };
}

function conditions(overrides: Partial<StartConditions> = {}): StartConditions {
  return {
    status: "lobby",
    selectedGameId: "fake-game",
    minPlayers: 2,
    maxPlayers: 4,
    players: [member({ playerId: "host" }), member({ playerId: "guest", ready: true })],
    hostId: "host",
    force: false,
    ...overrides,
  };
}

describe("canTransition", () => {
  it("allows the lobby to start a game", () => {
    expect(canTransition("lobby", "playing")).toBe(true);
  });

  it("allows a game to end in results or to be abandoned back to the lobby", () => {
    expect(canTransition("playing", "results")).toBe(true);
    expect(canTransition("playing", "lobby")).toBe(true);
  });

  it("refuses to go from the lobby straight to the results", () => {
    expect(canTransition("lobby", "results")).toBe(false);
  });

  it("refuses to restart a game from the results without passing by the lobby", () => {
    expect(canTransition("results", "playing")).toBe(false);
  });
});

describe("checkStartConditions", () => {
  it("accepts a lobby where everyone is ready", () => {
    expect(checkStartConditions(conditions())).toBeNull();
  });

  it("refuses outside the lobby", () => {
    expect(checkStartConditions(conditions({ status: "playing" }))).toBe("INVALID_STATE");
  });

  it("refuses without a selected game", () => {
    expect(checkStartConditions(conditions({ selectedGameId: null }))).toBe("NO_GAME_SELECTED");
  });

  it("refuses under the minimum", () => {
    const players = [member({ playerId: "host" })];

    expect(checkStartConditions(conditions({ players }))).toBe("NOT_ENOUGH_PLAYERS");
  });

  it("refuses over the maximum", () => {
    const players = [1, 2, 3, 4, 5].map((n) => member({ playerId: `p${n}`, ready: true }));

    expect(checkStartConditions(conditions({ players, hostId: "p1" }))).toBe("TOO_MANY_PLAYERS");
  });

  it("refuses when a connected player is not ready", () => {
    const players = [member({ playerId: "host" }), member({ playerId: "guest" })];

    expect(checkStartConditions(conditions({ players }))).toBe("NOT_ALL_READY");
  });

  it("accepts a player who is not ready when the host forces the start", () => {
    const players = [member({ playerId: "host" }), member({ playerId: "guest" })];

    expect(checkStartConditions(conditions({ players, force: true }))).toBeNull();
  });

  it("is not blocked by a disconnected player who is not ready", () => {
    const players = [
      member({ playerId: "host" }),
      member({ playerId: "away", connected: false }),
      member({ playerId: "guest", ready: true }),
    ];

    expect(checkStartConditions(conditions({ players }))).toBeNull();
  });

  it("keeps checking the player count even when the start is forced", () => {
    const players = [member({ playerId: "host" })];

    expect(checkStartConditions(conditions({ players, force: true }))).toBe("NOT_ENOUGH_PLAYERS");
  });

  it("does not require the host to be ready", () => {
    const players = [
      member({ playerId: "host", ready: false }),
      member({ playerId: "guest", ready: true }),
    ];

    expect(checkStartConditions(conditions({ players }))).toBeNull();
  });
});
