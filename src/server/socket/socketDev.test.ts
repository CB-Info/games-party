import { afterEach, describe, expect, it } from "vitest";

import { ARENA_HEIGHT, ARENA_WIDTH } from "../../shared/constants";
import { SANDBOX_CURSOR_RADIUS } from "../../games/sandbox/shared/constants";
import { SANDBOX_META } from "../../games/sandbox/shared/meta";
import type { SandboxView } from "../../games/sandbox/shared/types";
import {
  ask,
  createRoom,
  receivedViews,
  startTestServer,
  waitForNextState,
  waitForNextView,
  waitForState,
  waitForView,
  type TestClient,
  type TestServer,
} from "./socketTestHarness.fixture";

let server: TestServer | null = null;

afterEach(async () => {
  await server?.stop();
  server = null;
});

function mustServer(): TestServer {
  if (server === null) {
    throw new Error("The server is not started");
  }

  return server;
}

function sandboxView(payload: { view: unknown }): SandboxView {
  return payload.view as SandboxView;
}

/** How many players sit somewhere else than they did in `first`. */
function movedSince(first: SandboxView, later: SandboxView): number {
  return later.players.filter((player) => {
    const before = first.players.find((other) => other.playerId === player.playerId);
    return before !== undefined && (before.x !== player.x || before.y !== player.y);
  }).length;
}

/** Creates a room with `botCount` bots, selects the sandbox and starts it. */
async function startSandbox(
  botCount: number,
): Promise<{ host: TestClient; code: string; botIds: string[] }> {
  const { host, code } = await createRoom(mustServer());

  for (let index = 0; index < botCount; index += 1) {
    await ask(host).emitWithAck("dev:addBot");
  }

  const filled = await waitForState(host, (state) => state.players.length === botCount + 1);
  const botIds = filled.players.filter((player) => player.isBot).map((player) => player.playerId);

  await ask(host).emitWithAck("lobby:selectGame", { gameId: SANDBOX_META.id });
  await ask(host).emitWithAck("lobby:start", { force: false });

  return { host, code, botIds };
}

describe("development bots", () => {
  it("gives each bot a seat, a colour and a pseudo of its own", async () => {
    server = await startTestServer();
    const { host } = await createRoom(mustServer());

    await ask(host).emitWithAck("dev:addBot");
    await ask(host).emitWithAck("dev:addBot");

    const state = await waitForState(host, (s) => s.players.length === 3);
    const bots = state.players.filter((player) => player.isBot);

    expect(bots.map((bot) => bot.pseudo)).toEqual(["Bot 1", "Bot 2"]);
    expect(new Set(state.players.map((player) => player.color)).size).toBe(3);
    // A bot is never a host, and never keeps the room waiting for it (§8).
    expect(bots.some((bot) => bot.isHost)).toBe(false);
    expect(state.readyPlayerIds).toEqual(bots.map((bot) => bot.playerId));
  });

  it("refuses everything when bots are turned off, as in production", async () => {
    server = await startTestServer({ allowBots: false });
    const { host } = await createRoom(mustServer());

    const refused = await ask(host).emitWithAck("dev:addBot");

    expect(refused).toEqual({ ok: false, error: "INVALID_STATE" });
    expect((await waitForState(host)).players).toHaveLength(1);
  });

  it("lets only the host add one", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await waitForState(host, (state) => state.players.length === 2);

    expect(await ask(guest).emitWithAck("dev:addBot")).toEqual({ ok: false, error: "NOT_HOST" });
  });

  it("refuses to remove a person", async () => {
    server = await startTestServer();
    const { host, code } = await createRoom(mustServer());
    const guest = await mustServer().connect();
    await ask(guest).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    const state = await waitForState(host, (s) => s.players.length === 2);
    const nova = state.players.find((player) => player.pseudo === "Nova");

    const refused = await ask(host).emitWithAck("dev:removeBot", {
      playerId: nova?.playerId ?? "",
    });

    expect(refused).toEqual({ ok: false, error: "INVALID_STATE" });
  });
});

describe("a sandbox game driven by bots", () => {
  it("moves every cursor, inside the arena and outside the walls", async () => {
    server = await startTestServer();
    const { host } = await startSandbox(3);

    const first = sandboxView(await waitForView(host));
    expect(first.players).toHaveLength(4);

    // Waiting for a fact rather than for a duration: the room's clock is capped at MAX_TICK_DT_MS,
    // so a loaded machine plays a second of game in much more than a second of real time, and a
    // test written against the game clock would time out for no defect.
    await waitForNextView(host, (payload) => movedSince(first, sandboxView(payload)) >= 3);

    // Every view received so far, not just one. Only the arena's edges are checked here: the
    // walls are covered where they can be aimed at — `moveCursor.test.ts` and the pillar test of
    // `SandboxGame.test.ts` — and a wandering bot may simply never meet one in the few ticks this
    // test lasts. Asserting it here would be a check that passes for the wrong reason.
    for (const payload of receivedViews(host)) {
      for (const player of sandboxView(payload).players) {
        expect(player.x).toBeGreaterThanOrEqual(SANDBOX_CURSOR_RADIUS);
        expect(player.x).toBeLessThanOrEqual(ARENA_WIDTH - SANDBOX_CURSOR_RADIUS);
        expect(player.y).toBeGreaterThanOrEqual(SANDBOX_CURSOR_RADIUS);
        expect(player.y).toBeLessThanOrEqual(ARENA_HEIGHT - SANDBOX_CURSOR_RADIUS);
      }
    }
  });

  it("drops a bot removed mid-game from the views that follow", async () => {
    server = await startTestServer();
    const { host, botIds } = await startSandbox(2);
    const leaving = botIds[0] ?? "";

    await waitForView(host);

    // Both waits are registered first: the room broadcasts before it acknowledges.
    const goneFromRoom = waitForNextState(host, (state) => state.players.length === 2);
    const goneFromGame = waitForNextView(host, (payload) =>
      sandboxView(payload).players.every((player) => player.playerId !== leaving),
    );
    await ask(host).emitWithAck("dev:removeBot", { playerId: leaving });

    // Disappearing from the view is the proof that the game was told: `SandboxGame.onPlayerLeave`
    // is the only thing that drops a player from its list.
    expect(sandboxView(await goneFromGame).players).toHaveLength(2);
    expect((await goneFromRoom).players.filter((player) => player.isBot)).toHaveLength(1);
  });
});
