import { afterEach, describe, expect, it } from "vitest";

import { SOCKET_PING_INTERVAL_MS, SOCKET_PING_TIMEOUT_MS } from "../../shared/constants";
import {
  ask,
  createRoom,
  sessionOf,
  startTestServer,
  waitForReplaced,
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

describe("noticing a connection that died", () => {
  it("pings often enough for a game to react in seconds", async () => {
    server = await startTestServer();
    const { opts } = mustServer().socketServer.io.engine;

    // The library waits 25 s between pings and 20 s for an answer by default, so a player who
    // pulled the cable stayed on screen for three quarters of a minute (§13).
    expect(opts.pingInterval).toBe(SOCKET_PING_INTERVAL_MS);
    expect(opts.pingTimeout).toBe(SOCKET_PING_TIMEOUT_MS);
    expect(SOCKET_PING_INTERVAL_MS + SOCKET_PING_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });

  it("lets a test shorten both, since neither can be waited out", async () => {
    server = await startTestServer({ pingIntervalMs: 80, pingTimeoutMs: 80 });
    const { opts } = mustServer().socketServer.io.engine;

    expect(opts.pingInterval).toBe(80);
    expect(opts.pingTimeout).toBe(80);
  });
});

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

  it("never lets the replaced tab take the seat back", async () => {
    server = await startTestServer();
    const { code } = await createRoom(mustServer());

    // This one reconnects the way the real client does, which is the whole point: if it came back
    // it would take the seat from the new tab, which would take it back, and so on.
    const firstTab = await mustServer().connect({}, { reconnection: true, reconnectionDelay: 50 });
    const session = await sessionOf(firstTab);
    await ask(firstTab).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });

    const replaced = waitForReplaced(firstTab);
    const secondTab = await mustServer().connect({ sessionToken: session.sessionToken });
    await sessionOf(secondTab);
    await expect(replaced).resolves.toBe(true);

    // Long past several attempts at the shortened delay above.
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(firstTab.connected).toBe(false);
    // Still the seat's owner, so nothing was stolen back from it.
    await expect(ask(secondTab).emitWithAck("lobby:setReady", { ready: true })).resolves.toEqual({
      ok: true,
    });
  });
});
