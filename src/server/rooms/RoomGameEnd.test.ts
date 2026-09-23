import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeGame, lastFakeGameInstance } from "../../games/fakeGame.fixture";
import { RESULTS_AUTO_RETURN_MS } from "../../shared/constants";
import { addPlayer, createTestRoom } from "./roomTestHarness.fixture";

/** A room with a host and two ready players, ready to start the fake game. */
function startableRoom() {
  const harness = createTestRoom();
  const host = addPlayer(harness.room, "Mika", "c1");
  const nova = addPlayer(harness.room, "Nova", "c2");
  const zippy = addPlayer(harness.room, "Zippy", "c3");
  harness.room.selectGame(host, fakeGame.meta.id);
  harness.room.setReady(nova, true);
  harness.room.setReady(zippy, true);

  return { ...harness, host, nova, zippy };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a running game", () => {
  it("sends a view to every connected player at each tick", () => {
    const { room, host, outbound } = startableRoom();
    room.start(host, false);
    outbound.views.length = 0;

    vi.advanceTimersByTime(100);

    expect(new Set(outbound.views.map((view) => view.playerId)).size).toBe(3);
  });

  it("makes a newcomer a spectator", () => {
    const { room, host, outbound } = startableRoom();
    room.start(host, false);

    addPlayer(room, "Tardif", "c4");

    expect(outbound.lastState?.players.at(-1)?.isSpectator).toBe(true);
  });

  it("tells the game when a player disconnects and comes back", () => {
    const { room, host, nova } = startableRoom();
    room.start(host, false);

    room.disconnect(nova);
    room.reconnect(nova);

    expect(lastFakeGameInstance?.disconnected).toEqual([nova]);
    expect(lastFakeGameInstance?.reconnected).toEqual([nova]);
  });

  it("tells the game when a new connection takes the seat of a player still there", () => {
    // Another tab, or a reconnection the server had not seen coming: the new connection numbers
    // its inputs from zero, so the game must forget what it saw, while nobody sees Nova leave.
    const { room, host, nova, outbound } = startableRoom();
    room.start(host, false);

    room.reconnect(nova);

    expect(lastFakeGameInstance?.disconnected).toEqual([]);
    expect(lastFakeGameInstance?.reconnected).toEqual([nova]);
    expect(outbound.lastState?.players.every((player) => player.connected)).toBe(true);
  });

  it("abandons the game when too few players are left", () => {
    const { room, host, nova, zippy, outbound } = startableRoom();
    room.start(host, false);

    room.remove(nova);
    room.remove(zippy);

    expect(outbound.events.at(-1)?.event).toEqual({ type: "aborted" });
    expect(outbound.lastState?.status).toBe("lobby");
    expect(outbound.lastState?.cumulative).toEqual([]);
  });

  it("refuses an action from a spectator", () => {
    const { room, host } = startableRoom();
    room.start(host, false);
    const late = addPlayer(room, "Tardif", "c4");

    expect(room.handleAction(late, { type: "score", amount: 1 })).toBe("INVALID_STATE");
  });

  it("refuses an action the game's own schema rejects", () => {
    const { room, host } = startableRoom();
    room.start(host, false);

    expect(room.handleAction(host, { type: "unknown" })).toBe("INVALID_PAYLOAD");
  });
});

describe("the end of a game", () => {
  it("awards points and shows the results", () => {
    const { room, host, outbound } = startableRoom();
    room.start(host, false);
    room.handleAction(host, { type: "score", amount: 10 });

    vi.advanceTimersByTime(2000);

    expect(outbound.lastState?.status).toBe("results");
    expect(outbound.results.at(-1)?.ranking.at(0)?.playerId).toBe(host);
    expect(outbound.results.at(-1)?.ranking.at(0)?.pointsAwarded).toBe(2);
  });

  it("returns to the lobby on its own after the delay", () => {
    const { room, host, outbound } = startableRoom();
    room.start(host, false);
    vi.advanceTimersByTime(2000);

    vi.advanceTimersByTime(RESULTS_AUTO_RETURN_MS);

    expect(outbound.lastState?.status).toBe("lobby");
  });

  it("turns spectators into players and clears the ready statuses at the lobby", () => {
    const { room, host, outbound } = startableRoom();
    room.start(host, false);
    addPlayer(room, "Tardif", "c4");
    vi.advanceTimersByTime(2000);

    room.backToLobby(host);

    expect(outbound.lastState?.players.every((player) => !player.isSpectator)).toBe(true);
    expect(outbound.lastState?.readyPlayerIds).toEqual([]);
  });

  it("refuses the return to the lobby to anyone but the host", () => {
    const { room, host, nova } = startableRoom();
    room.start(host, false);
    vi.advanceTimersByTime(2000);

    expect(room.backToLobby(nova)).toBe("NOT_HOST");
  });

  it("keeps the results in the room state while they are shown", () => {
    const { room, host, outbound } = startableRoom();
    room.start(host, false);

    vi.advanceTimersByTime(2000);

    expect(outbound.lastState?.lastResults?.ranking).toHaveLength(3);
  });
});
