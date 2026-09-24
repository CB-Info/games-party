import { describe, expect, it } from "vitest";

import { CHAT_COUNT_MIN } from "../shared/constants";
import { chatCountFor, drawChats } from "./chatDraw";

describe("chatCountFor", () => {
  it("gives the number the host set when the players allow it", () => {
    expect(chatCountFor(2, 5)).toBe(2);
  });

  it("leaves at least one Runner among the connected players", () => {
    expect(chatCountFor(4, 4)).toBe(3);
    // Six players, but only three of them connected: two Chats, not four.
    expect(chatCountFor(4, 3)).toBe(2);
  });

  it("never gives fewer than one Chat", () => {
    expect(chatCountFor(3, 1)).toBe(CHAT_COUNT_MIN);
    expect(chatCountFor(3, 0)).toBe(CHAT_COUNT_MIN);
  });
});

describe("drawChats", () => {
  const players = ["a", "b", "c", "d"];

  it("draws only among the connected players when they are enough", () => {
    const connected = new Set(["b", "c", "d"]);

    for (const draw of [0, 0.4, 0.99]) {
      const chats = drawChats(
        players,
        2,
        (id) => connected.has(id),
        () => draw,
      );

      expect(chats).toHaveLength(2);
      expect(new Set(chats).size).toBe(2);
      expect(chats.every((id) => connected.has(id))).toBe(true);
    }
  });

  it("draws with the randomness it is given", () => {
    const connected = () => true;

    expect(drawChats(players, 1, connected, () => 0)).toEqual(["b"]);
    expect(drawChats(players, 1, connected, () => 0.99)).toEqual(["a"]);
  });

  it("completes among the disconnected players when too few are connected", () => {
    const chats = drawChats(
      players,
      2,
      (id) => id === "c",
      () => 0,
    );

    expect(chats).toHaveLength(2);
    expect(chats[0]).toBe("c");
    expect(["a", "b", "d"]).toContain(chats[1]);
  });

  it("draws among the disconnected players when nobody is connected", () => {
    expect(
      drawChats(
        players,
        1,
        () => false,
        () => 0,
      ),
    ).toHaveLength(1);
  });
});
