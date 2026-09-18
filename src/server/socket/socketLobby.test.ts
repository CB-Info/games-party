import { afterEach, describe, expect, it } from "vitest";

import {
  ask,
  createRoom,
  sessionOf,
  startTestServer,
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

describe("the lobby over a real connection", () => {
  it("shows a player who declares themselves ready", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    const guestSession = await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });

    const seen = waitForState(host, (state) => state.readyPlayerIds.length === 1);
    const answer = await ask(guest).emitWithAck("lobby:setReady", { ready: true });

    expect(answer).toEqual({ ok: true });
    expect((await seen).readyPlayerIds).toEqual([guestSession.playerId]);
  });

  it("refuses the ready status to the host", async () => {
    server = await startTestServer();
    const { host } = await createRoom(mustServer());

    const answer = await ask(host).emitWithAck("lobby:setReady", { ready: true });

    expect(answer).toEqual({ ok: false, error: "INVALID_STATE" });
  });

  it("refuses a message whose shape is wrong, without ever crashing", async () => {
    server = await startTestServer();
    const { host } = await createRoom(mustServer());

    const answer = await ask(host).emitWithAck("lobby:setReady", { ready: "oui" } as never);
    const stillAlive = await ask(host).emitWithAck("lobby:setColor", { color: "c4" });

    expect(answer).toEqual({ ok: false, error: "INVALID_PAYLOAD" });
    expect(stillAlive).toEqual({ ok: true });
  });
});
