import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_ROOMS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "../../shared/constants";
import { RoomManager } from "./RoomManager";
import { RecordingOutbound } from "./roomTestHarness.fixture";

const EMPTY_ROOM_TTL_MS = 500;

function createManager(): RoomManager {
  return new RoomManager({
    outboundFor: () => new RecordingOutbound(),
    findGame: () => null,
    random: () => 0.5,
    now: () => Date.now(),
    emptyRoomTtlMs: EMPTY_ROOM_TTL_MS,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RoomManager", () => {
  it("gives a room a code of the documented length and alphabet", () => {
    const room = createManager().create();

    expect(room?.code).toHaveLength(ROOM_CODE_LENGTH);
    expect([...(room?.code ?? "")].every((c) => ROOM_CODE_ALPHABET.includes(c))).toBe(true);
  });

  it("gives every room a different code", () => {
    const manager = createManager();
    const codes = new Set(Array.from({ length: 20 }, () => manager.create()?.code));

    expect(codes.size).toBe(20);
  });

  it("finds a room back by its code", () => {
    const manager = createManager();
    const room = manager.create();

    expect(manager.get(room?.code ?? "")).toBe(room);
  });

  it("knows nothing about an unknown code", () => {
    expect(createManager().get("nosuchroom")).toBeNull();
  });

  it("refuses to open more than the maximum number of rooms", () => {
    const manager = createManager();
    for (let i = 0; i < MAX_ROOMS; i += 1) {
      manager.create();
    }

    expect(manager.create()).toBeNull();
  });

  it("deletes a room that stayed empty for longer than its lifetime", () => {
    const manager = createManager();
    const room = manager.create();

    vi.advanceTimersByTime(EMPTY_ROOM_TTL_MS);
    manager.pruneEmpty(Date.now());

    expect(manager.get(room?.code ?? "")).toBeNull();
  });

  it("keeps a room somebody joined", () => {
    const manager = createManager();
    const room = manager.create();
    room?.join({
      playerId: "p1",
      sessionToken: "token-p1",
      pseudo: "Mika",
      preferredColor: "c1",
    });

    vi.advanceTimersByTime(EMPTY_ROOM_TTL_MS);
    manager.pruneEmpty(Date.now());

    expect(manager.get(room?.code ?? "")).toBe(room);
  });

  it("keeps an empty room until its lifetime is over", () => {
    const manager = createManager();
    const room = manager.create();

    vi.advanceTimersByTime(EMPTY_ROOM_TTL_MS - 1);
    manager.pruneEmpty(Date.now());

    expect(manager.get(room?.code ?? "")).toBe(room);
  });

  it("frees a slot when a room is deleted", () => {
    const manager = createManager();
    const first = manager.create();
    for (let i = 1; i < MAX_ROOMS; i += 1) {
      manager.create();
    }

    manager.delete(first?.code ?? "");

    expect(manager.size).toBe(MAX_ROOMS - 1);
    expect(manager.create()).not.toBeNull();
  });
});
