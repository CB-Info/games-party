import { describe, expect, it } from "vitest";

import type { Player } from "../../shared/types";
import { playingPlayerId } from "./gameViewer";

function member(playerId: string, isSpectator = false): Player {
  return {
    playerId,
    pseudo: playerId,
    color: "c1",
    isHost: false,
    isBot: false,
    connected: true,
    isSpectator,
  };
}

const ROOM = [member("mika"), member("nova"), member("late", true)];

describe("playingPlayerId", () => {
  it("plays as the member this browser is, when they are a player of the game", () => {
    expect(playingPlayerId(ROOM, "nova")).toBe("nova");
  });

  it("only watches for a member who arrived during the game", () => {
    // Their session has an id, but the server sends them the spectator's view (§5.4).
    expect(playingPlayerId(ROOM, "late")).toBeNull();
  });

  it("only watches without a session, or with one the room does not hold", () => {
    expect(playingPlayerId(ROOM, null)).toBeNull();
    expect(playingPlayerId(ROOM, "stranger")).toBeNull();
  });
});
