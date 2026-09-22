import { afterEach, describe, expect, it } from "vitest";

import { ROOM_CODE_LENGTH } from "../../shared/constants";
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

describe("creating and joining a room", () => {
  it("answers with a room code and sends the room state", async () => {
    server = await startTestServer();

    const { host, code } = await createRoom(mustServer());
    const state = await waitForState(host);

    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    expect(state.players.map((player) => player.pseudo)).toEqual(["Mika"]);
    expect(state.hostId).toBe(state.players[0]?.playerId);
  });

  it("shows a newcomer to everyone already in the room", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    await waitForState(host);

    const seen = waitForState(host, (state) => state.players.length === 2);
    const guest = await mustServer().connect();
    await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });

    expect((await seen).players.map((player) => player.pseudo)).toEqual(["Mika", "Nova"]);
  });

  it("refuses a pseudo already taken in the room", async () => {
    server = await startTestServer();
    const { code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    await sessionOf(guest);

    const joined = await ask(guest).emitWithAck("room:join", {
      code,
      pseudo: "mika",
      preferredColor: "c2",
    });

    expect(joined).toEqual({ ok: false, error: "PSEUDO_TAKEN" });
  });

  it("refuses an unknown room code", async () => {
    server = await startTestServer();
    const client = await mustServer().connect();
    await sessionOf(client);

    const joined = await ask(client).emitWithAck("room:join", {
      code: "zzzzzzzzzz",
      pseudo: "Mika",
      preferredColor: "c1",
    });

    expect(joined).toEqual({ ok: false, error: "ROOM_NOT_FOUND" });
  });

  it("changes nothing when a player joins the room they are already in", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await ask(guest).emitWithAck("lobby:setReady", { ready: true });
    const before = await waitForState(host, (state) => state.readyPlayerIds.length === 1);

    // A different pseudo, and one already worn by somebody else: neither is applied, and neither
    // is refused. The seat is simply given back as it is (docs/architecture.md, §5.1). The wait is
    // registered first: the room broadcasts before it acknowledges.
    const later = waitForNextState(host, () => true);
    const again = await ask(host).emitWithAck("room:join", {
      code,
      pseudo: "Nova",
      preferredColor: "c9",
    });
    const after = await later;

    expect(again).toEqual({ ok: true, data: { code } });
    expect(after.players).toEqual(before.players);
    expect(after.hostId).toBe(before.hostId);
    expect(after.readyPlayerIds).toEqual(before.readyPlayerIds);
  });

  it("forgets a room that was left empty", async () => {
    server = await startTestServer({
      reconnectGraceMs: 50,
      emptyRoomTtlMs: 50,
      maintenanceIntervalMs: 20,
    });
    const { host, code } = await createRoom(mustServer());
    const visitor = await mustServer().connect();
    await sessionOf(visitor);

    // Nothing deletes a room on its own: only the periodic sweep does (§5.1).
    host.disconnect();

    await expect
      .poll(() =>
        ask(visitor)
          .emitWithAck("room:preview", { code })
          .then((answer) => answer.ok),
      )
      .toBe(false);
  });
});

describe("previewing a room without joining it", () => {
  it("answers with the players and no identifier at all", async () => {
    server = await startTestServer();
    const { code } = await createRoom(mustServer());
    const visitor = await mustServer().connect();
    await sessionOf(visitor);

    const preview = await ask(visitor).emitWithAck("room:preview", { code });

    expect(preview.ok && preview.data.players).toEqual([
      { pseudo: "Mika", color: "c1", isHost: true },
    ]);
    expect(preview.ok && preview.data.status).toBe("lobby");
    expect(JSON.stringify(preview)).not.toContain("sessionToken");
  });

  it("does not put the visitor in the room", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    const visitor = await mustServer().connect();
    await sessionOf(visitor);

    await ask(visitor).emitWithAck("room:preview", { code });
    const state = await waitForState(host);

    expect(state.players).toHaveLength(1);
  });
});
