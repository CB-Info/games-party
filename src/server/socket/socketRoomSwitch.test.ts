import { afterEach, describe, expect, it } from "vitest";

import {
  ask,
  createRoom,
  sessionOf,
  startTestServer,
  waitForNextState,
  waitForState,
  type TestServer,
} from "./socketTestHarness.fixture";

let server: TestServer | null = null;

afterEach(async () => {
  await server?.stop();
  server = null;
});

/** The running server, with a clear message when a test forgot to start one. */
function mustServer(): TestServer {
  if (server === null) {
    throw new Error("The server is not started");
  }

  return server;
}

describe("a refused join", () => {
  it("leaves the player in the room they were already in", async () => {
    server = await startTestServer();
    const first = await createRoom(mustServer());
    const other = await createRoom(mustServer());

    const guest = await mustServer().connect();
    await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", {
      code: first.code,
      pseudo: "Nova",
      preferredColor: "c2",
    });
    await waitForState(first.host, (state) => state.players.length === 2);

    // "Mika" is the host of the other room, so this join is refused.
    const refused = await ask(guest).emitWithAck("room:join", {
      code: other.code,
      pseudo: "Mika",
      preferredColor: "c3",
    });

    // Nothing is broadcast when a join is refused, so the room is read back instead.
    expect(refused).toEqual({ ok: false, error: "PSEUDO_TAKEN" });
    const preview = await ask(guest).emitWithAck("room:preview", { code: first.code });
    expect(preview.ok && preview.data.players.map((player) => player.pseudo)).toEqual([
      "Mika",
      "Nova",
    ]);
  });

  it("takes the player out of their previous room when the join succeeds", async () => {
    server = await startTestServer();
    const first = await createRoom(mustServer());
    const other = await createRoom(mustServer());

    const guest = await mustServer().connect();
    await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", {
      code: first.code,
      pseudo: "Nova",
      preferredColor: "c2",
    });
    await waitForState(first.host, (state) => state.players.length === 2);

    const left = waitForNextState(first.host, (s) => s.players.length === 1);
    await ask(guest).emitWithAck("room:join", {
      code: other.code,
      pseudo: "Nova",
      preferredColor: "c3",
    });

    expect((await left).players.map((player) => player.pseudo)).toEqual(["Mika"]);
  });
});
