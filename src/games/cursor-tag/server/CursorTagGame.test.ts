import { describe, expect, it } from "vitest";

import { PORTAL_RADIUS } from "../shared/constants";
import { PORTAL_PAIRS } from "../shared/map";
import {
  QUICK,
  TICK_MS,
  chatsOf,
  openRoom,
  positionOf,
  roundViewOf,
  startRound,
  walk,
} from "./CursorTagGame.fixture";

const THREE = ["mika", "nova", "zippy"];
const FOUR = [...THREE, "lumo"];

/** Portal A's first mouth, which Nova reaches from her spawn point without meeting a wall. */
const PORTAL = PORTAL_PAIRS[0]?.first ?? { x: 0, y: 0 };

describe("a game of Cursor Tag in its room", () => {
  it("starts with the preparation of the first round, nobody ready yet", () => {
    const room = openRoom(THREE);

    expect(room.viewOf("mika")).toMatchObject({
      phase: "preparation",
      round: 1,
      preparationStep: "waiting",
      readyPlayerIds: [],
      players: THREE.map((playerId) => ({ playerId, connected: true, scoreMs: 0 })),
    });
  });

  it("sends the events of an action, and refuses one outside the waiting", () => {
    const room = openRoom(THREE);

    expect(room.game.onAction("mika", { type: "ready" })).toEqual({ ok: true });
    room.game.onAction("nova", { type: "ready" });
    room.game.onAction("zippy", { type: "ready" });

    expect(room.events).toEqual([
      { type: "readyChanged", playerId: "mika", ready: true },
      { type: "readyChanged", playerId: "nova", ready: true },
      { type: "readyChanged", playerId: "zippy", ready: true },
      { type: "preparationCountdown", round: 1, auto: false },
    ]);
    expect(room.game.onAction("mika", { type: "notReady" })).toEqual({
      ok: false,
      error: "INVALID_STATE",
    });
  });

  it("sends the events of its ticks: the automatic countdown, the round's start and end", () => {
    const room = openRoom(THREE);

    room.tickUntil(() => room.eventsOfType("roundEnd").length > 0, 2000);

    expect(room.events.map((event) => event.type)).toEqual([
      "preparationCountdown",
      "roundStart",
      "roundEnd",
    ]);
    expect(room.events[0]).toEqual({ type: "preparationCountdown", round: 1, auto: true });
    // The room's randomness is fixed: the draw gives Zippy (rules.md, §4).
    expect(room.events[1]).toEqual({ type: "roundStart", round: 1, chatIds: ["zippy"] });
    expect(room.events[2]).toEqual({ type: "roundEnd", round: 1 });
  });

  it("applies a person's input once, and a bot's every time", () => {
    // A bot's input never travels, so it carries no sequence number to check (architecture §6.5).
    const room = openRoom(THREE, { bots: ["nova"] });
    startRound(room, THREE);
    room.game.tick(TICK_MS);
    const before = roundViewOf(room, "mika");

    room.game.onInput("mika", { seq: 1, dx: 10, dy: 0 });
    room.game.onInput("mika", { seq: 1, dx: 10, dy: 0 });
    room.game.onInput("nova", { seq: 0, dx: 10, dy: 0 });
    room.game.onInput("nova", { seq: 0, dx: 10, dy: 0 });

    const after = roundViewOf(room, "mika");
    expect(positionOf(after, "mika").x - positionOf(before, "mika").x).toBe(10);
    expect(positionOf(after, "nova").x - positionOf(before, "nova").x).toBe(20);
  });

  it("sends a portal from the input that enters it", () => {
    const room = openRoom(THREE);
    startRound(room, THREE);
    room.game.tick(TICK_MS);

    walk(room, "nova", PORTAL, (_, budget) => budget);

    expect(room.eventsOfType("portal")).toEqual([{ type: "portal", playerId: "nova", pair: "A" }]);
  });

  it("sends a portal from the tick that pays a remainder into it", () => {
    const room = openRoom(THREE, { settings: { ...QUICK, catchUpMs: 300 } });
    startRound(room, THREE);
    room.game.tick(TICK_MS);

    // Walk until the mouth is further than one budget away, but less than two.
    walk(room, "nova", PORTAL, (distance, budget) => {
      const toMouth = distance - PORTAL_RADIUS;
      return toMouth < budget * 1.8 ? null : Math.min(budget, toMouth - budget * 1.5);
    });
    const view = roundViewOf(room, "nova");
    const from = positionOf(view, "nova");
    const distance = Math.hypot(PORTAL.x - from.x, PORTAL.y - from.y);
    const ratio = (distance - PORTAL_RADIUS + 10) / distance;
    // More than the budget pays: the rest is kept, and paid by a later tick (rules.md, §6.6).
    room.game.onInput("nova", {
      seq: 999,
      dx: (PORTAL.x - from.x) * ratio,
      dy: (PORTAL.y - from.y) * ratio,
    });
    room.game.tick(TICK_MS);
    expect(room.eventsOfType("portal")).toEqual([]);

    room.game.tick(TICK_MS);

    expect(room.eventsOfType("portal")).toEqual([{ type: "portal", playerId: "nova", pair: "A" }]);
  });

  it("sends a tag from the tick a Chat reaches a Runner", () => {
    // Zippy is the Chat, with Lumo standing a short run away (rules.md, §6.5).
    const room = openRoom(FOUR);
    startRound(room, FOUR);
    expect(chatsOf(room)).toEqual(["zippy"]);
    room.tickUntil(() => roundViewOf(room, "zippy").players[2]?.frozenMsLeft === 0, 100);

    for (let seq = 0; room.eventsOfType("tag").length === 0; seq += 1) {
      if (seq > 100) {
        throw new Error("Zippy never reached Lumo");
      }
      const view = roundViewOf(room, "zippy");
      const from = positionOf(view, "zippy");
      const to = positionOf(view, "lumo");
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const length = Math.min(view.me?.budget ?? 0, distance);
      room.game.onInput("zippy", {
        seq,
        dx: ((to.x - from.x) * length) / distance,
        dy: ((to.y - from.y) * length) / distance,
      });
      room.game.tick(TICK_MS);
    }

    expect(room.eventsOfType("tag")).toEqual([{ type: "tag", chatId: "zippy", taggedId: "lumo" }]);
  });

  it("sends every event to the whole room", () => {
    const room = openRoom(THREE);

    room.tickUntil(() => room.game.isOver(), 5000);

    expect(room.events.length).toBeGreaterThan(0);
    expect(room.recipients.every((to) => to === undefined)).toBe(true);
  });

  it("ranks the players on the whole seconds they see, once the game is over", () => {
    const room = openRoom(THREE, { settings: { ...QUICK, roundCount: 1 } });
    startRound(room, THREE);
    const chats = chatsOf(room);

    room.tickUntil(() => room.game.isOver(), 200);

    const ranking = room.game.getRanking();
    expect(ranking.map((entry) => entry.playerId).slice(-1)).toEqual(chats);
    // A Runner never tagged runs the whole round, which is QUICK's two seconds.
    expect(ranking[0]).toEqual({ playerId: expect.any(String), score: 2 });
  });

  it("has no view once the game is over: the room shows the results instead", () => {
    const room = openRoom(THREE, { settings: { ...QUICK, roundCount: 1 } });
    room.tickUntil(() => room.game.isOver(), 2000);

    expect(() => room.game.getViewFor({ spectator: true })).toThrow("over has no view");
  });
});
