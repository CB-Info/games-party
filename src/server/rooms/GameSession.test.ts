import { describe, expect, it, vi } from "vitest";

import { chattyFakeGame } from "../../games/fakeGame.fixture";
import type { GamePlayer } from "../../games/gameServer.types";
import { GameSession } from "./GameSession";
import { RecordingOutbound } from "./roomTestHarness.fixture";

const PLAYERS: readonly GamePlayer[] = [
  { playerId: "mika", color: "c1", isBot: false, connected: true },
  { playerId: "nova", color: "c2", isBot: false, connected: true },
];

/** The chatty fake game, played by two people and watched by one spectator. */
function chattySession(durationMs = 1000) {
  const outbound = new RecordingOutbound();
  const session = new GameSession({
    game: chattyFakeGame,
    options: { durationMs },
    players: () => PLAYERS,
    spectators: () => ["zippy"],
    getHostId: () => "mika",
    outbound,
    random: () => 0.5,
    now: () => 0,
  });

  return { session, outbound };
}

describe("the messages of a tick", () => {
  it("sends the events of a tick after every view of that tick", () => {
    // Sent first, the event would still occupy the connection when the views follow, and
    // Socket.IO would drop every one of them (docs/architecture.md, §6.3).
    const { session, outbound } = chattySession();

    session.tickOnce(33);

    expect(outbound.order).toEqual(["view", "view", "view", "event:ticked"]);
  });

  it("sends the events of the last tick, which sends no view", () => {
    const { session, outbound } = chattySession(100);

    const over = session.tickOnce(100);

    expect(over).toBe(true);
    expect(outbound.order).toEqual(["event:ticked"]);
  });

  it("sends an event from outside a tick at once", () => {
    const { session, outbound } = chattySession();

    session.applyAction("mika", { type: "score", amount: 1 });

    expect(outbound.order).toEqual(["event:scored"]);
  });

  it("holds nothing back after a tick that failed", () => {
    const { session, outbound } = chattySession();
    const tick = session.instance.tick.bind(session.instance);
    vi.spyOn(session.instance, "tick").mockImplementationOnce((dtMs) => {
      tick(dtMs);
      throw new Error("the game broke");
    });

    expect(() => session.tickOnce(33)).toThrow("the game broke");
    session.applyAction("mika", { type: "score", amount: 1 });

    expect(outbound.order).toEqual(["event:ticked", "event:scored"]);
  });
});
