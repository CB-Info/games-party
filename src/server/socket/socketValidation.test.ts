import { afterEach, describe, expect, it } from "vitest";

import { MAX_MESSAGE_BYTES } from "../../shared/constants";
import {
  ACK_TIMEOUT_MS,
  sessionOf,
  startTestServer,
  waitForState,
  type TestClient,
  type TestServer,
} from "./socketTestHarness.fixture";

let server: TestServer | null = null;

afterEach(async () => {
  await server?.stop();
  server = null;
});

function ask(client: TestClient) {
  return client.timeout(ACK_TIMEOUT_MS);
}

async function connected(): Promise<TestClient> {
  if (server === null) {
    throw new Error("The server is not started");
  }

  const client = await server.connect();
  await sessionOf(client);
  return client;
}

describe("message size and shape (§9)", () => {
  it("never lets a message bigger than the limit through", async () => {
    server = await startTestServer();
    const client = await connected();

    const closed = new Promise<void>((resolve) => client.on("disconnect", () => resolve()));
    client.emit("room:preview", { code: "a".repeat(MAX_MESSAGE_BYTES) }, () => {});

    await expect(closed).resolves.toBeUndefined();
  });

  it("answers INVALID_PAYLOAD and keeps serving after a malformed message", async () => {
    server = await startTestServer();
    const client = await connected();

    const refused = await ask(client).emitWithAck("room:create", { pseudo: 42 } as never);
    const accepted = await ask(client).emitWithAck("room:create", {
      pseudo: "Mika",
      preferredColor: "c1",
    });

    expect(refused).toEqual({ ok: false, error: "INVALID_PAYLOAD" });
    expect(accepted.ok).toBe(true);
  });

  it("refuses a pseudo that is too short after trimming", async () => {
    server = await startTestServer();
    const client = await connected();

    const refused = await ask(client).emitWithAck("room:create", {
      pseudo: "  a  ",
      preferredColor: "c1",
    });

    expect(refused).toEqual({ ok: false, error: "INVALID_PAYLOAD" });
  });

  it("refuses an unexpected key, since every payload is strict", async () => {
    server = await startTestServer();
    const client = await connected();

    const refused = await ask(client).emitWithAck("room:create", {
      pseudo: "Mika",
      preferredColor: "c1",
      isHost: true,
    } as never);

    expect(refused).toEqual({ ok: false, error: "INVALID_PAYLOAD" });
  });
});

describe("the session bound to a socket (§4)", () => {
  it("never believes a player id sent by a client", async () => {
    server = await startTestServer();
    const client = await server.connect({ playerId: "usurpateur", sessionToken: "inventé" });
    const session = await sessionOf(client);

    expect(session.playerId).not.toBe("usurpateur");
    expect(session.sessionToken).not.toBe("inventé");
  });

  it("gives the seat back to the second tab without the others seeing anything", async () => {
    server = await startTestServer();
    const host = await connected();
    const created = await ask(host).emitWithAck("room:create", {
      pseudo: "Mika",
      preferredColor: "c1",
    });
    const code = created.ok ? created.data.code : "";
    const guest = await connected();
    const session = await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await waitForState(host, (state) => state.players.length === 2);

    const secondTab = await server.connect({ sessionToken: session.sessionToken });
    await sessionOf(secondTab);
    const rejoined = await ask(secondTab).emitWithAck("room:join", {
      code,
      pseudo: "Nova",
      preferredColor: "c2",
    });

    expect(rejoined).toEqual({ ok: true, data: { code } });
    const state = await waitForState(host, (s) => s.players.length === 2);
    expect(state.players.every((player) => player.connected)).toBe(true);
  });
});
