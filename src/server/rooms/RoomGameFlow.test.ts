import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeGame } from "../../games/fakeGame.fixture";
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

describe("starting a game", () => {
  it("refuses without a selected game", () => {
    const { room } = createTestRoom();
    const host = addPlayer(room, "Mika");
    addPlayer(room, "Nova", "c2");

    expect(room.start(host, false)).toBe("NO_GAME_SELECTED");
  });

  it("refuses under the minimum number of players", () => {
    const { room } = createTestRoom();
    const host = addPlayer(room, "Mika");
    room.selectGame(host, fakeGame.meta.id);

    expect(room.start(host, false)).toBe("NOT_ENOUGH_PLAYERS");
  });

  it("refuses over the maximum number of players", () => {
    const { room } = createTestRoom();
    const host = addPlayer(room, "Mika");
    for (const pseudo of ["Nova", "Zippy", "Biscuit", "Pixel"]) {
      addPlayer(room, pseudo, "c2");
    }
    room.selectGame(host, fakeGame.meta.id);

    expect(room.start(host, false)).toBe("TOO_MANY_PLAYERS");
  });

  it("refuses while a connected player is not ready", () => {
    const { room, host, nova } = startableRoom();
    room.setReady(nova, false);

    expect(room.start(host, false)).toBe("NOT_ALL_READY");
  });

  it("accepts when the host forces the start", () => {
    const { room, host, nova } = startableRoom();
    room.setReady(nova, false);

    expect(room.start(host, true)).toBeNull();
  });

  it("is not blocked by a disconnected player who is not ready", () => {
    const { room, host, nova } = startableRoom();
    room.setReady(nova, false);
    room.disconnect(nova);

    expect(room.start(host, false)).toBeNull();
  });

  it("refuses the start to anyone but the host", () => {
    const { room, nova } = startableRoom();

    expect(room.start(nova, false)).toBe("NOT_HOST");
  });

  it("moves the room to the playing state", () => {
    const { room, host, outbound } = startableRoom();

    room.start(host, false);

    expect(outbound.lastState?.status).toBe("playing");
  });
});
