import { afterEach, describe, expect, it } from "vitest";

import { chattyFakeGame } from "../../games/fakeGame.fixture";
import type { GameViewPayload } from "../../shared/types";
import {
  ask,
  createRoom,
  receivedArrivals,
  startTestServer,
  waitForArrival,
  type Arrival,
  type TestServer,
} from "./socketTestHarness.fixture";

/** The chatty game lasts a second of game time; the real loop plays it in about as much. */
const GAME_TIMEOUT_MS = 5000;

let server: TestServer | null = null;

afterEach(async () => {
  await server?.stop();
  server = null;
});

/** The game time a view shows, which the chatty game's event of the same tick also carries. */
function elapsedOfView(payload: GameViewPayload): unknown {
  const view = payload.view;
  return typeof view === "object" && view !== null && "elapsedMs" in view ? view.elapsedMs : null;
}

describe("the events of a tick on a real connection", () => {
  it("never cost a player the view of their tick", async () => {
    // Socket.IO drops a volatile view sent while a reliable message still occupies the
    // connection: with the events sent first, not a single view of the game arrived (§6.3).
    server = await startTestServer({
      findGame: (id) => (id === chattyFakeGame.meta.id ? chattyFakeGame : null),
    });
    const { host } = await createRoom(server);
    await ask(host).emitWithAck("dev:addBot");
    await ask(host).emitWithAck("lobby:selectGame", { gameId: chattyFakeGame.meta.id });
    await ask(host).emitWithAck("lobby:start", { force: false });

    await waitForArrival(host, (arrival) => arrival.kind === "results", GAME_TIMEOUT_MS);

    const game = receivedArrivals(host).filter(
      (arrival) => arrival.kind === "view" || arrival.kind === "event",
    );
    const ticks = game.filter(
      (arrival) => arrival.kind === "event" && arrival.event.type === "ticked",
    );
    // The last tick ends the game and sends no view; every other one sends its view first.
    const ticksWithView = ticks.slice(0, -1);
    expect(ticksWithView.length).toBeGreaterThan(20);

    for (const tick of ticksWithView) {
      const before: Arrival | undefined = game[game.indexOf(tick) - 1];
      expect(before?.kind).toBe("view");
      if (before?.kind === "view" && tick.kind === "event") {
        expect(elapsedOfView(before.payload)).toBe(tick.event.elapsedMs);
      }
    }
  }, 10_000);
});
