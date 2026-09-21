import { afterEach, describe, expect, it } from "vitest";

import {
  ask,
  createRoom,
  receivedStates,
  sessionOf,
  startTestServer,
  waitForNextState,
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

describe("leaving and coming back", () => {
  it("keeps the seat of a player who comes back within the delay", async () => {
    server = await startTestServer({ reconnectGraceMs: SHORT_GRACE_MS });
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    const session = await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });

    const away = waitForNextState(host, (state) => state.players.some((p) => !p.connected));
    guest.disconnect();
    await away;

    // Everyone was connected before the drop, so only a later state proves the return.
    const seen = waitForNextState(host, (state) => state.players.every((p) => p.connected));
    const back = await mustServer().connect({ sessionToken: session.sessionToken });
    await sessionOf(back);
    const rejoined = await ask(back).emitWithAck("room:join", {
      code,
      pseudo: "Nova",
      preferredColor: "c2",
    });

    expect(rejoined).toEqual({ ok: true, data: { code } });
    expect((await seen).players.map((player) => player.playerId)).toContain(session.playerId);
  });

  it("removes a player who leaves on purpose", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await waitForState(host, (state) => state.players.length === 2);

    // The room held one player at creation, so the departure needs a state that comes after.
    const gone = waitForNextState(host, (state) => state.players.length === 1);
    guest.emit("room:leave");

    expect((await gone).players.map((player) => player.pseudo)).toEqual(["Mika"]);
  });
});

describe("coming back without asking for anything", () => {
  it("gives the seat back and tells the other players", async () => {
    server = await startTestServer({ reconnectGraceMs: SHORT_GRACE_MS });
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    const session = await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });

    const away = waitForNextState(host, (state) => state.players.some((p) => !p.connected));
    guest.disconnect();
    await away;

    // The client only lets Socket.IO reconnect: it never sends room:join again (§10).
    const back = waitForNextState(host, (state) => state.players.every((p) => p.connected));
    await mustServer().connect({ sessionToken: session.sessionToken });

    const state = await back;
    expect(state.players).toHaveLength(2);
    expect(state.players.map((player) => player.playerId)).toContain(session.playerId);
  });

  it("keeps the player connected when a second socket takes the seat", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    const session = await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await waitForState(host, (state) => state.players.length === 2);

    const replaced = waitForReplaced(guest);
    const seen = waitForNextState(host, (state) => state.players.length === 2);
    await mustServer().connect({ sessionToken: session.sessionToken });

    await expect(replaced).resolves.toBe(true);
    expect((await seen).players.every((player) => player.connected)).toBe(true);
  });

  it("sends the room back before it answers anything the member asks", async () => {
    server = await startTestServer({ reconnectGraceMs: SHORT_GRACE_MS });
    const { code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    const session = await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    guest.disconnect();

    const back = await mustServer().connect({ sessionToken: session.sessionToken });
    const preview = await ask(back).emitWithAck("room:preview", { code });

    // The invitation screen leans on this order: `room:state` goes out while the connection is
    // still being handled, so a member always has it before any answer of its own can arrive.
    // Without it, "the preview answered and no state came" would not mean "not a member".
    expect(preview.ok).toBe(true);
    expect(receivedStates(back)).toHaveLength(1);
  });

  it("says nothing to a player whose seat expired while they were away", async () => {
    server = await startTestServer({ reconnectGraceMs: SHORT_GRACE_MS });
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    const session = await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await waitForState(host, (state) => state.players.length === 2);

    const removed = waitForNextState(host, (state) => state.players.length === 1);
    guest.disconnect();
    await removed;

    const back = await mustServer().connect({ sessionToken: session.sessionToken });
    const preview = await ask(back).emitWithAck("room:preview", { code });

    // The room is still there but the seat is gone, so the preview is answered and nothing else is
    // sent. That silence is what puts the invitation screen back rather than the lobby (§10).
    expect(preview.ok).toBe(true);
    expect(receivedStates(back)).toHaveLength(0);
  });

  it("tells the other players when the grace delay runs out", async () => {
    server = await startTestServer({ reconnectGraceMs: SHORT_GRACE_MS });
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await waitForState(host, (state) => state.players.length === 2);

    const removed = waitForNextState(host, (state) => state.players.length === 1);
    guest.disconnect();

    expect((await removed).players.map((player) => player.pseudo)).toEqual(["Mika"]);
  });
});
