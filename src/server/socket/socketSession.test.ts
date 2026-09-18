import { afterEach, describe, expect, it } from "vitest";

import {
  ask,
  createRoom,
  sessionOf,
  startTestServer,
  waitForReplaced,
  waitForState,
  type TestServer,
} from "./socketTestHarness.fixture";

/** Short enough for a test, long enough for a real round trip. */
const SHORT_GRACE_MS = 200;

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

describe("a session over a real connection", () => {
  it("gives every new connection its own identity", async () => {
    server = await startTestServer();

    const first = await sessionOf(await mustServer().connect());
    const second = await sessionOf(await mustServer().connect());

    expect(first.sessionToken).toHaveLength(32);
    expect(first.playerId).toHaveLength(12);
    expect(second.playerId).not.toBe(first.playerId);
  });

  it("gives the same identity back to a known token", async () => {
    server = await startTestServer();
    const first = await sessionOf(await mustServer().connect());

    const again = await sessionOf(await mustServer().connect({ sessionToken: first.sessionToken }));

    expect(again.playerId).toBe(first.playerId);
  });

  it("tells the first tab when the same session is opened elsewhere", async () => {
    server = await startTestServer();
    const firstTab = await mustServer().connect();
    const session = await sessionOf(firstTab);

    const replaced = waitForReplaced(firstTab);
    await mustServer().connect({ sessionToken: session.sessionToken });

    await expect(replaced).resolves.toBe(true);
  });
});

describe("leaving and coming back", () => {
  it("keeps the seat of a player who comes back within the delay", async () => {
    server = await startTestServer({ reconnectGraceMs: SHORT_GRACE_MS });
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    const session = await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });

    const away = waitForState(host, (state) => state.players.some((p) => !p.connected));
    guest.disconnect();
    await away;

    const back = await mustServer().connect({ sessionToken: session.sessionToken });
    await sessionOf(back);
    const rejoined = await ask(back).emitWithAck("room:join", {
      code,
      pseudo: "Nova",
      preferredColor: "c2",
    });

    expect(rejoined).toEqual({ ok: true, data: { code } });
    const state = await waitForState(host, (s) => s.players.every((p) => p.connected));
    expect(state.players.map((player) => player.playerId)).toContain(session.playerId);
  });

  it("removes a player who leaves on purpose", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await waitForState(host, (state) => state.players.length === 2);

    const gone = waitForState(host, (state) => state.players.length === 1);
    guest.emit("room:leave");

    expect((await gone).players.map((player) => player.pseudo)).toEqual(["Mika"]);
  });
});
