import { describe, expect, it } from "vitest";

import { QUICK, chatsOf, openRoom, roundViewOf, startRound } from "./CursorTagGame.fixture";

const THREE = ["mika", "nova", "zippy"];
const FOUR = [...THREE, "lumo"];
const FIVE = [...FOUR, "pixel"];

describe("a player who loses their connection", () => {
  it("is no longer ready during the waiting", () => {
    const room = openRoom(THREE);
    room.game.onAction("mika", { type: "ready" });

    room.disconnect("mika");

    expect(room.events.at(-1)).toEqual({ type: "readyChanged", playerId: "mika", ready: false });
  });

  it("starts the countdown when they were the only one the others were waiting for", () => {
    const room = openRoom(THREE);
    room.game.onAction("mika", { type: "ready" });
    room.game.onAction("nova", { type: "ready" });

    room.disconnect("zippy");

    expect(room.events.at(-1)).toEqual({ type: "preparationCountdown", round: 1, auto: false });
  });

  it("is replaced as the Chat by a connected Runner during a round", () => {
    // The room's randomness is fixed: Pixel is drawn Chat, and Nova to replace them.
    const room = openRoom(FIVE);
    startRound(room, FIVE);
    const [chat] = chatsOf(room);
    expect(chat).toBe("pixel");

    room.disconnect(chat ?? "");

    expect(room.eventsOfType("chatReplaced")).toEqual([
      { type: "chatReplaced", previousChatId: chat, newChatId: "nova" },
    ]);
  });

  it("numbers their inputs from zero again once back", () => {
    const room = openRoom(THREE);
    startRound(room, THREE);
    room.game.onInput("mika", { seq: 40, dx: 0, dy: 0 });

    room.disconnect("mika");
    room.reconnect("mika");
    room.game.onInput("mika", { seq: 0, dx: 0, dy: 0 });

    expect(roundViewOf(room, "mika").me?.lastProcessedSeq).toBe(0);
  });
});

describe("a player who leaves", () => {
  it("starts the countdown when they were the only one the others were waiting for", () => {
    const room = openRoom(FOUR);
    for (const playerId of THREE) {
      room.game.onAction(playerId, { type: "ready" });
    }

    room.leave("lumo");

    expect(room.events.at(-1)).toEqual({ type: "preparationCountdown", round: 1, auto: false });
  });

  it("is replaced as the Chat by a connected Runner", () => {
    const room = openRoom(FIVE);
    startRound(room, FIVE);
    const [chat] = chatsOf(room);

    room.leave(chat ?? "");

    expect(room.eventsOfType("chatReplaced")).toEqual([
      { type: "chatReplaced", previousChatId: chat, newChatId: "nova" },
    ]);
  });

  it("ends the round at once when they were the last Runner", () => {
    // Three Chats out of four players leave a single Runner (rules.md, §4).
    const room = openRoom(FOUR, { settings: { ...QUICK, chatCount: 3 } });
    startRound(room, FOUR);
    const runner = FOUR.find((playerId) => !chatsOf(room).includes(playerId)) ?? "";

    room.leave(runner);

    expect(room.events.at(-1)).toEqual({ type: "roundEnd", round: 1 });
    expect(room.viewOf("mika")).toMatchObject({ phase: "preparation", round: 2 });
  });

  it("ends the game when the last round loses its last Runner, and leaves the ranking", () => {
    const room = openRoom(FOUR, { settings: { ...QUICK, chatCount: 3, roundCount: 1 } });
    startRound(room, FOUR);
    const runner = FOUR.find((playerId) => !chatsOf(room).includes(playerId)) ?? "";

    room.leave(runner);

    expect(room.game.isOver()).toBe(true);
    expect(
      room.game
        .getRanking()
        .map((entry) => entry.playerId)
        .sort(),
    ).toEqual(FOUR.filter((playerId) => playerId !== runner).sort());
  });
});

describe("a spectator who comes and goes", () => {
  it("changes nothing in the game", () => {
    // The room tells the game about its spectators too: the game has nothing to do with them.
    const room = openRoom(THREE);
    room.game.onAction("mika", { type: "ready" });
    room.game.onAction("nova", { type: "ready" });
    const before = room.viewOf("mika");
    const sent = room.events.length;

    room.game.onPlayerDisconnect("lurker");
    room.game.onPlayerReconnect("lurker");
    room.game.onPlayerLeave("lurker");

    expect(room.events).toHaveLength(sent);
    expect(room.viewOf("mika")).toEqual(before);
  });
});
