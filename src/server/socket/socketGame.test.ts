import { afterEach, describe, expect, it } from "vitest";

import { fakeGame, otherFakeGame } from "../../games/fakeGame.fixture";
import {
  ACK_TIMEOUT_MS,
  sessionOf,
  startTestServer,
  waitForNextState,
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

function ask(client: TestClient) {
  return client.timeout(ACK_TIMEOUT_MS);
}

/** A room with a host and two ready guests, on a real connection. */
async function readyRoom(): Promise<{ host: TestClient; guests: TestClient[]; code: string }> {
  if (server === null) {
    throw new Error("The server is not started");
  }

  const host = await server.connect();
  await sessionOf(host);
  const created = await ask(host).emitWithAck("room:create", {
    pseudo: "Mika",
    preferredColor: "c1",
  });
  if (!created.ok) {
    throw new Error(`room:create refused: ${created.error}`);
  }

  const code = created.data.code;
  const guests: TestClient[] = [];

  for (const [index, pseudo] of ["Nova", "Zippy"].entries()) {
    const guest = await server.connect();
    await sessionOf(guest);
    await ask(guest).emitWithAck("room:join", {
      code,
      pseudo,
      preferredColor: index === 0 ? "c2" : "c3",
    });
    guests.push(guest);
  }

  // The game is chosen first: picking a different one clears every ready status (§5.8).
  await ask(host).emitWithAck("lobby:selectGame", { gameId: fakeGame.meta.id });
  for (const guest of guests) {
    await ask(guest).emitWithAck("lobby:setReady", { ready: true });
  }

  return { host, guests, code };
}

describe("playing a game over a real connection", () => {
  it("sends every player their own view once the game starts", async () => {
    server = await startTestServer({
      findGame: (id) => [fakeGame, otherFakeGame].find((game) => game.meta.id === id) ?? null,
    });
    const { host, guests } = await readyRoom();

    const started = await ask(host).emitWithAck("lobby:start", { force: false });
    const view = await waitForView(guests[0] as TestClient);

    expect(started).toEqual({ ok: true });
    expect(view.tick).toBeGreaterThan(0);
    expect(view.serverTime).toBeGreaterThan(0);
  });

  it("refuses the start to a player who is not the host", async () => {
    server = await startTestServer({
      findGame: (id) => (id === fakeGame.meta.id ? fakeGame : null),
    });
    const { guests } = await readyRoom();

    const refused = await ask(guests[0] as TestClient).emitWithAck("lobby:start", { force: false });

    expect(refused).toEqual({ ok: false, error: "NOT_HOST" });
  });

  it("refuses the start while a connected player is not ready", async () => {
    server = await startTestServer({
      findGame: (id) => (id === fakeGame.meta.id ? fakeGame : null),
    });
    const { host, guests } = await readyRoom();
    await ask(guests[0] as TestClient).emitWithAck("lobby:setReady", { ready: false });

    const refused = await ask(host).emitWithAck("lobby:start", { force: false });

    expect(refused).toEqual({ ok: false, error: "NOT_ALL_READY" });
  });

  it("tells the players who were ready that the host changed the game", async () => {
    server = await startTestServer({
      findGame: (id) => [fakeGame, otherFakeGame].find((game) => game.meta.id === id) ?? null,
    });
    const { host, guests } = await readyRoom();
    const guest = guests[0] as TestClient;

    const told = new Promise<{ gameId: string }>((resolve) => {
      guest.on("lobby:gameChanged", resolve);
    });
    await ask(host).emitWithAck("lobby:selectGame", { gameId: otherFakeGame.meta.id });

    expect((await told).gameId).toBe(otherFakeGame.meta.id);
    const state = await waitForState(host, (s) => s.selectedGameId === otherFakeGame.meta.id);
    expect(state.readyPlayerIds).toEqual([]);
  });

  it("keeps the ready statuses when the host only changes an option", async () => {
    server = await startTestServer({
      findGame: (id) => (id === fakeGame.meta.id ? fakeGame : null),
    });
    const { host } = await readyRoom();

    const next = waitForNextState(host, () => true);
    const answer = await ask(host).emitWithAck("lobby:setOptions", {
      options: { durationMs: 3000 },
    });

    expect(answer).toEqual({ ok: true });
    const state = await next;
    expect(state.readyPlayerIds).toHaveLength(2);
    expect(state.selectedGameOptions).toEqual({ durationMs: 3000 });
  });

  it("makes a newcomer a spectator and gives them the spectator view", async () => {
    server = await startTestServer({
      findGame: (id) => (id === fakeGame.meta.id ? fakeGame : null),
    });
    const { host, code } = await readyRoom();
    await ask(host).emitWithAck("lobby:start", { force: false });

    const late = await server.connect();
    await sessionOf(late);
    await ask(late).emitWithAck("room:join", { code, pseudo: "Tardif", preferredColor: "c4" });
    const state = await waitForState(late, (s) => s.players.length === 4);

    expect(state.players.at(-1)?.isSpectator).toBe(true);
  });

  it("shows the results to everyone when the game is over", async () => {
    server = await startTestServer({
      findGame: (id) => (id === fakeGame.meta.id ? fakeGame : null),
    });
    const { host, guests } = await readyRoom();
    await ask(host).emitWithAck("lobby:setOptions", { options: { durationMs: 100 } });

    await ask(host).emitWithAck("lobby:start", { force: false });
    const state = await waitForState(guests[0] as TestClient, (s) => s.status === "results");

    expect(state.lastResults?.ranking).toHaveLength(3);
    expect(state.cumulative).toHaveLength(3);
  });
});
