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
