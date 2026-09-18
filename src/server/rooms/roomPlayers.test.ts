import { describe, expect, it } from "vitest";

import type { PlayerColorId } from "../../shared/types";
import type { RoomMember } from "./roomMember";
import { electHost, isPseudoTaken, isRoomEmpty, pickColor } from "./roomPlayers";

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

describe("pickColor", () => {
  it("gives the preferred colour when it is free", () => {
    expect(pickColor([member({ playerId: "a", color: "c3" })], "c5")).toBe("c5");
  });

  it("falls back to the first free colour in order", () => {
    const members = [
      member({ playerId: "a", color: "c1" }),
      member({ playerId: "b", color: "c2" }),
    ];

    expect(pickColor(members, "c1")).toBe("c3");
  });

  it("returns null when every colour is taken", () => {
    const members = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"].map((color, i) =>
      member({ playerId: `p${i}`, color: color as PlayerColorId }),
    );

    expect(pickColor(members, "c1")).toBeNull();
  });
});

describe("isPseudoTaken", () => {
  it("ignores the case", () => {
    expect(isPseudoTaken([member({ playerId: "a", pseudo: "Mika" })], "mika")).toBe(true);
  });

  it("accepts a free pseudo", () => {
    expect(isPseudoTaken([member({ playerId: "a", pseudo: "Mika" })], "Nova")).toBe(false);
  });

  it("lets a player keep their own pseudo", () => {
    const members = [member({ playerId: "a", pseudo: "Mika" })];

    expect(isPseudoTaken(members, "Mika", "a")).toBe(false);
  });
});

describe("electHost", () => {
  it("takes the human who has been here the longest", () => {
    const members = [
      member({ playerId: "late", joinedAt: 20 }),
      member({ playerId: "early", joinedAt: 10 }),
    ];

    expect(electHost(members)).toBe("early");
  });

  it("skips a disconnected player in favour of a connected one", () => {
    const members = [
      member({ playerId: "early", joinedAt: 10, connected: false }),
      member({ playerId: "late", joinedAt: 20 }),
    ];

    expect(electHost(members)).toBe("late");
  });

  it("falls back to the oldest player when nobody is connected", () => {
    const members = [
      member({ playerId: "early", joinedAt: 10, connected: false }),
      member({ playerId: "late", joinedAt: 20, connected: false }),
    ];

    expect(electHost(members)).toBe("early");
  });

  it("never elects a bot", () => {
    const members = [
      member({ playerId: "bot", joinedAt: 10, isBot: true }),
      member({ playerId: "human", joinedAt: 20 }),
    ];

    expect(electHost(members)).toBe("human");
  });

  it("returns null when only bots are left", () => {
    expect(electHost([member({ playerId: "bot", isBot: true })])).toBeNull();
  });
});

describe("isRoomEmpty", () => {
  it("is empty with no member at all", () => {
    expect(isRoomEmpty([])).toBe(true);
  });

  it("is empty when only bots are left", () => {
    expect(isRoomEmpty([member({ playerId: "bot", isBot: true })])).toBe(true);
  });

  it("is not empty while a disconnected human keeps a seat", () => {
    expect(isRoomEmpty([member({ playerId: "a", connected: false })])).toBe(false);
  });
});
