import { afterEach, describe, expect, it } from "vitest";

import { SANDBOX_META } from "../../games/sandbox/shared/meta";
import type { SandboxView } from "../../games/sandbox/shared/types";
import { playerBehind, startRelay, type Relay } from "./socketRelay.fixture";
import {
  ask,
  connected,
  receivedStates,
  sessionOf,
  startTestServer,
  waitForNextView,
  waitForState,
  waitForView,
  type TestClient,
  type TestServer,
} from "./socketTestHarness.fixture";

let server: TestServer | null = null;
/** The relay a test put between the server and its host, and the host behind it. */
let relay: Relay | null = null;
let host: TestClient | null = null;

afterEach(async () => {
  host?.disconnect();
  relay?.close();
  await server?.stop();
  server = null;
  relay = null;
  host = null;
});

function mustServer(): TestServer {
  if (server === null) {
    throw new Error("No test server running");
  }
  return server;
}

function sandboxView(payload: { view: unknown }): SandboxView {
  return payload.view as SandboxView;
}

function xOf(view: SandboxView, playerId: string): number {
  return view.players.find((player) => player.playerId === playerId)?.x ?? Number.NaN;
}

/**
 * `player` creates a room, Nova joins it to see what the room tells everyone, and the sandbox
 * starts. The player then plays for a moment: forty inputs, so that the server's count of them
 * reaches 39.
 */
async function playSandbox(player: TestClient): Promise<{ playerId: string; nova: TestClient }> {
  const { playerId } = await sessionOf(player);
  const created = await ask(player).emitWithAck("room:create", {
    pseudo: "Mika",
    preferredColor: "c1",
  });
  if (!created.ok) {
    throw new Error(`room:create refused: ${created.error}`);
  }

  const nova = await connected(mustServer());
  const { code } = created.data;
  await ask(nova).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
  await waitForState(player, (state) => state.players.length === 2);
  await ask(player).emitWithAck("lobby:selectGame", { gameId: SANDBOX_META.id });
  await ask(player).emitWithAck("lobby:start", { force: true });
  await waitForView(player);

  for (let seq = 0; seq < 40; seq += 1) {
    player.emit("game:input", { seq, dx: 5, dy: 0 });
  }
  await waitForNextView(player, (payload) => sandboxView(payload).me?.lastProcessedSeq === 39);

  return { playerId, nova };
}

/**
 * The first input of a new connection, numbered from zero as the client does after any reconnection
 * (docs/architecture.md, §6.5), and sent back the way the cursor came, which is sure to be free.
 * Resolves to how far it moved the cursor; fails if the server ignores it.
 */
async function firstInputMoves(client: TestClient, playerId: string): Promise<number> {
  const before = xOf(sandboxView(await waitForNextView(client, () => true)), playerId);
  client.emit("game:input", { seq: 0, dx: -5, dy: 0 });
  const after = await waitForNextView(client, (payload) => {
    return sandboxView(payload).me?.lastProcessedSeq === 0;
  });

  return before - xOf(sandboxView(after), playerId);
}

function reconnection(client: TestClient): Promise<void> {
  return new Promise((resolve) => {
    client.io.once("reconnect", () => resolve());
  });
}

/** Whether the room told Nova, since `from` states ago, that the player had gone away. */
function seenAway(nova: TestClient, from: number, playerId: string): boolean {
  return receivedStates(nova)
    .slice(from)
    .some((state) => state.players.some((p) => p.playerId === playerId && !p.connected));
}

describe("a new connection to a seat during a game", () => {
  it("moves the cursor with the first input of a second tab", async () => {
    server = await startTestServer();
    const firstTab = await connected(server);
    const { playerId } = await playSandbox(firstTab);
    const { sessionToken } = await sessionOf(firstTab);

    const secondTab = await server.connect({ sessionToken });

    expect(await firstInputMoves(secondTab, playerId)).toBeCloseTo(5, 1);
  });

  it("moves it after a cut on the player's side, before the server noticed", async () => {
    // Back in a tenth of a second, long before the server's heartbeat gives up on the old socket:
    // the new connection takes a seat the server still believes in use, as a second tab does.
    server = await startTestServer();
    relay = await startRelay(server.url);
    host = playerBehind(relay.url);
    const { playerId, nova } = await playSandbox(host);
    const from = receivedStates(nova).length;
    let toldReplaced = false;
    host.on("session:replaced", () => {
      toldReplaced = true;
    });

    const back = reconnection(host);
    relay.cut();
    await back;

    expect(await firstInputMoves(host, playerId)).toBeCloseTo(5, 1);
    expect(seenAway(nova, from, playerId)).toBe(false);
    // The notice meant for a tab that lost its seat went to the dead socket, not to this page.
    expect(toldReplaced).toBe(false);
  });

  it("moves it after a silent network, which the server notices first", async () => {
    // Nothing passes and nothing is closed: both sides wait out the same heartbeat, shortened
    // here, and the client waits a little longer before coming back. The seat is empty by then.
    server = await startTestServer({ pingIntervalMs: 500, pingTimeoutMs: 500 });
    relay = await startRelay(server.url);
    host = playerBehind(relay.url);
    const { playerId, nova } = await playSandbox(host);
    const from = receivedStates(nova).length;

    const back = reconnection(host);
    relay.silence();
    await back;

    expect(await firstInputMoves(host, playerId)).toBeCloseTo(5, 1);
    expect(seenAway(nova, from, playerId)).toBe(true);
  });
});
