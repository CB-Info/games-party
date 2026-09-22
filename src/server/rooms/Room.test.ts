import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RECONNECT_GRACE_MS, ROOM_CAPACITY } from "../../shared/constants";
import { addPlayer, createTestRoom } from "./roomTestHarness.fixture";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Room membership", () => {
  it("makes the first player the host", () => {
    const { room } = createTestRoom();

    const host = addPlayer(room, "Mika");

    expect(room.hostId).toBe(host);
  });

  it("refuses a pseudo already taken, whatever its case", () => {
    const { room } = createTestRoom();
    addPlayer(room, "Mika");

    const result = room.join({
      playerId: "other",
      sessionToken: "token-other",
      pseudo: "mika",
      preferredColor: "c2",
    });

    expect(result).toEqual({ ok: false, error: "PSEUDO_TAKEN" });
  });

  it("hands out the first free colour when the preferred one is taken", () => {
    const { room, outbound } = createTestRoom();
    addPlayer(room, "Mika", "c1");

    addPlayer(room, "Nova", "c1");

    expect(outbound.lastState?.players.map((player) => player.color)).toEqual(["c1", "c2"]);
  });

  it("refuses to go over the room capacity", () => {
    const { room } = createTestRoom();
    for (let i = 0; i < ROOM_CAPACITY; i += 1) {
      addPlayer(room, `Joueur${i}`);
    }

    const result = room.join({
      playerId: "extra",
      sessionToken: "token-extra",
      pseudo: "Extra",
      preferredColor: "c1",
    });

    expect(result).toEqual({ ok: false, error: "ROOM_FULL" });
  });

  it("passes the host role to the oldest connected player when the host leaves", () => {
    const { room } = createTestRoom();
    const host = addPlayer(room, "Mika");
    const second = addPlayer(room, "Nova", "c2");
    const third = addPlayer(room, "Zippy", "c3");
    room.disconnect(second);

    room.remove(host);

    expect(room.hostId).toBe(third);
  });
});

describe("Room reconnection", () => {
  it("keeps the seat of a disconnected player until the grace delay", () => {
    const { room } = createTestRoom();
    const mika = addPlayer(room, "Mika");
    addPlayer(room, "Nova", "c2");

    room.disconnect(mika);

    expect(room.member(mika)?.connected).toBe(false);
  });

  it("gives the seat back to a player who comes back in time", () => {
    const { room } = createTestRoom();
    const mika = addPlayer(room, "Mika");
    room.disconnect(mika);

    vi.advanceTimersByTime(1000);
    room.reconnect(mika);
    // Past the whole delay: coming back has to have cancelled the removal, not postponed it.
    vi.advanceTimersByTime(RECONNECT_GRACE_MS);

    expect(room.member(mika)?.connected).toBe(true);
  });

  it("removes a player who never comes back", () => {
    const { room } = createTestRoom();
    const mika = addPlayer(room, "Mika");
    addPlayer(room, "Nova", "c2");
    room.disconnect(mika);

    vi.advanceTimersByTime(RECONNECT_GRACE_MS);

    expect(room.member(mika)).toBeNull();
  });

  it("gives the same seat back to a session that joins again", () => {
    const { room } = createTestRoom();
    const mika = addPlayer(room, "Mika");
    room.disconnect(mika);

    const again = room.join({
      playerId: "ignored",
      sessionToken: `token-${mika}`,
      pseudo: "Autre",
      preferredColor: "c5",
    });

    expect(again.ok && again.member.playerId).toBe(mika);
    expect(room.member(mika)?.connected).toBe(true);
  });

  it("loses the ready status on disconnection", () => {
    const { room, outbound } = createTestRoom();
    addPlayer(room, "Mika");
    const nova = addPlayer(room, "Nova", "c2");
    room.setReady(nova, true);

    room.disconnect(nova);

    expect(outbound.lastState?.readyPlayerIds).toEqual([]);
  });
});
