import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeGame, otherFakeGame } from "../../games/fakeGame.fixture";
import { addPlayer, createTestRoom } from "./roomTestHarness.fixture";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Room lobby", () => {
  it("refuses a colour another player already holds", () => {
    const { room } = createTestRoom();
    addPlayer(room, "Mika", "c1");
    const nova = addPlayer(room, "Nova", "c2");

    expect(room.setColor(nova, "c1")).toBe("COLOR_TAKEN");
  });

  it("refuses the ready status to the host", () => {
    const { room } = createTestRoom();
    const host = addPlayer(room, "Mika");

    expect(room.setReady(host, true)).toBe("INVALID_STATE");
  });

  it("refuses to select a game to anyone but the host", () => {
    const { room } = createTestRoom();
    addPlayer(room, "Mika");
    const nova = addPlayer(room, "Nova", "c2");

    expect(room.selectGame(nova, fakeGame.id)).toBe("NOT_HOST");
  });

  it("starts with no game selected", () => {
    const { room, outbound } = createTestRoom();
    addPlayer(room, "Mika");

    expect(outbound.lastState?.selectedGameId).toBeNull();
  });

  it("gives the game its default options when it is chosen", () => {
    const { room, outbound } = createTestRoom();
    const host = addPlayer(room, "Mika");
    room.selectGame(host, fakeGame.id);

    expect(outbound.lastState?.selectedGameOptions).toEqual({ durationMs: 1000 });
  });

  it("clears the ready status when the host changes game", () => {
    const { room, outbound } = createTestRoom();
    const host = addPlayer(room, "Mika");
    const nova = addPlayer(room, "Nova", "c2");
    room.selectGame(host, fakeGame.id);
    room.setReady(nova, true);

    room.selectGame(host, otherFakeGame.id);

    expect(outbound.lastState?.readyPlayerIds).toEqual([]);
    expect(outbound.gameChanges.at(-1)?.playerIds).toEqual([nova]);
  });

  it("keeps the ready status when the host only changes an option", () => {
    const { room, outbound } = createTestRoom();
    const host = addPlayer(room, "Mika");
    const nova = addPlayer(room, "Nova", "c2");
    room.selectGame(host, fakeGame.id);
    room.setReady(nova, true);

    room.setOptions(host, { durationMs: 2000 });

    expect(outbound.lastState?.readyPlayerIds).toEqual([nova]);
    expect(outbound.lastState?.selectedGameOptions).toEqual({ durationMs: 2000 });
  });

  it("refuses options when no game is selected", () => {
    const { room } = createTestRoom();
    const host = addPlayer(room, "Mika");

    expect(room.setOptions(host, { durationMs: 2000 })).toBe("NO_GAME_SELECTED");
  });

  it("refuses options the game's own schema rejects", () => {
    const { room } = createTestRoom();
    const host = addPlayer(room, "Mika");
    room.selectGame(host, fakeGame.id);

    expect(room.setOptions(host, { durationMs: "long" })).toBe("INVALID_PAYLOAD");
  });
});

describe("Room preview", () => {
  it("shows the players without any identifier", () => {
    const { room } = createTestRoom();
    addPlayer(room, "Mika");

    const preview = room.preview();

    expect(preview.players).toEqual([{ pseudo: "Mika", color: "c1", isHost: true }]);
    expect(JSON.stringify(preview)).not.toContain("player-");
  });

  it("reports the lobby and then the game", () => {
    const { room } = createTestRoom();
    const host = addPlayer(room, "Mika");
    addPlayer(room, "Nova", "c2");
    room.selectGame(host, fakeGame.id);
    expect(room.preview().status).toBe("lobby");

    room.start(host, true);

    expect(room.preview().status).toBe("in_game");
  });
});
