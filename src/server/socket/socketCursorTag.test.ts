import { afterEach, describe, expect, it } from "vitest";

import { defineGame } from "../../games/defineGame";
import { CursorTagGame } from "../../games/cursor-tag/server/CursorTagGame";
import { cursorTagDefinition } from "../../games/cursor-tag/server/cursorTagDefinition";
import { settingsFor } from "../../games/cursor-tag/logic/cursorTagOptions";
import { readView } from "../../games/cursor-tag/logic/readView";
import { CURSOR_TAG_META } from "../../games/cursor-tag/shared/meta";
import type { CursorTagOptions } from "../../games/cursor-tag/shared/schemas";
import type { CursorTagView, CursorTagWireView } from "../../games/cursor-tag/shared/types";
import type { GameViewPayload } from "../../shared/types";
import {
  ask,
  connected,
  createRoom,
  receivedArrivals,
  sessionOf,
  startTestServer,
  waitForArrival,
  waitForNextView,
  waitForState,
  type Arrival,
  type TestClient,
  type TestServer,
} from "./socketTestHarness.fixture";

/**
 * Cursor Tag as registered, but for a round of a second and a half and a freeze of a third of a
 * second: at its shortest a real game lasts more than half a minute. Only the settings change, in
 * the one place the definition turns options into them; the countdown, a constant, stays.
 */
const QUICK_TAG = defineGame({
  ...cursorTagDefinition,
  create: (ctx, options) =>
    new CursorTagGame(ctx, { ...settingsFor(options), roundMs: 1500, freezeMs: 300 }),
});

const ONE_ROUND: CursorTagOptions = {
  chatCount: 1,
  roundCount: 1,
  roundDurationS: 30,
  freezeDurationS: 1,
};

/** The 3 s countdown, the round, and room to spare on a busy machine. */
const GAME_TIMEOUT_MS = 10_000;

/**
 * The same draws in every run (docs/architecture.md, §11): with this seed, a bot is drawn Chat,
 * and chases the others round the arena. Only the timing of the real loop still varies.
 */
function seededRandom(): () => number {
  let seed = 1;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

let server: TestServer | null = null;

afterEach(async () => {
  await server?.stop();
  server = null;
});

/** A view from our own server, read the way the bots and the client read it. */
function viewOf(payload: GameViewPayload): CursorTagView {
  return readView(payload.view as CursorTagWireView);
}

/** A room hosted by Mika, with the quick Cursor Tag chosen and `bots` bots added. */
async function tagRoom(bots: number): Promise<{ host: TestClient; code: string }> {
  server = await startTestServer({
    findGame: (id) => (id === CURSOR_TAG_META.id ? QUICK_TAG : null),
    random: seededRandom(),
  });
  const room = await createRoom(server);
  for (let bot = 0; bot < bots; bot += 1) {
    await ask(room.host).emitWithAck("dev:addBot");
  }
  await ask(room.host).emitWithAck("lobby:selectGame", { gameId: CURSOR_TAG_META.id });
  await ask(room.host).emitWithAck("lobby:setOptions", { options: ONE_ROUND });
  return room;
}

function eventsIn(arrivals: readonly Arrival[]): Array<Record<string, unknown>> {
  return arrivals.flatMap((arrival) => (arrival.kind === "event" ? [arrival.event] : []));
}

describe("Cursor Tag over a real connection", () => {
  it("plays a whole game, from the ready check to the results", async () => {
    const { host } = await tagRoom(2);
    const { playerId: mika } = await sessionOf(host);
    expect(await ask(host).emitWithAck("lobby:start", { force: false })).toEqual({ ok: true });
    await waitForArrival(host, (arrival) => arrival.kind === "view", GAME_TIMEOUT_MS);

    // Without Mika's click the game would wait the twenty seconds of the automatic start.
    expect(await ask(host).emitWithAck("game:action", { type: "ready" })).toEqual({ ok: true });
    await waitForArrival(host, (arrival) => arrival.kind === "results", GAME_TIMEOUT_MS);

    const arrivals = receivedArrivals(host);
    const milestones = eventsIn(arrivals).filter(
      (event) => event.type !== "tag" && event.type !== "portal",
    );
    const members = (await waitForState(host)).players;
    const players = members.map((player) => player.playerId);
    expect(
      milestones
        .slice(0, 3)
        .map((event) => event.playerId)
        .sort(),
    ).toEqual(players.sort());
    expect(milestones.slice(0, 3).every((event) => event.type === "readyChanged")).toBe(true);
    expect(milestones.slice(3)).toEqual([
      { type: "preparationCountdown", round: 1, auto: false },
      { type: "roundStart", round: 1, chatIds: [expect.any(String)] },
      { type: "roundEnd", round: 1 },
    ]);
    expect(players).toContain(mika);
    const chatIds = milestones.find((event) => event.type === "roundStart")?.chatIds;
    const drawn = Array.isArray(chatIds) ? chatIds[0] : null;
    expect(members.find((member) => member.playerId === drawn)?.isBot).toBe(true);

    // The round's end comes just before the results, and the room state that shows them.
    const results = arrivals.findIndex((arrival) => arrival.kind === "results");
    const afterResults = arrivals.slice(results + 1);
    expect(arrivals[results - 1]).toEqual({ kind: "event", event: { type: "roundEnd", round: 1 } });
    expect(afterResults.some((a) => a.kind === "state" && a.state.status === "results")).toBe(true);

    // The tick that starts the round sends its views before announcing it: sent first, the
    // announcement would cost every player that view (architecture §6.3).
    const start = arrivals.findIndex(
      (arrival) => arrival.kind === "event" && arrival.event.type === "roundStart",
    );
    const beforeStart = arrivals[start - 1];
    expect(beforeStart?.kind === "view" && viewOf(beforeStart.payload).phase).toBe("round");

    // Not one view of the round lost: their tick numbers follow on, whatever the tags and portals
    // of this run (§6.3). socketGameEvents.test.ts checks the same at every tick of a game.
    const roundTicks = arrivals.flatMap((arrival) =>
      arrival.kind === "view" && viewOf(arrival.payload).phase === "round"
        ? [arrival.payload.tick]
        : [],
    );
    expect(roundTicks.length).toBeGreaterThan(30);
    expect(
      roundTicks.every((tick, index) => index === 0 || tick === (roundTicks[index - 1] ?? 0) + 1),
    ).toBe(true);
  }, 15_000);

  it("drops a player who loses their connection from the ready list, and takes them back", async () => {
    const { host, code } = await tagRoom(1);
    const nova = await connected(server as TestServer);
    const { playerId: novaId, sessionToken } = await sessionOf(nova);
    await ask(nova).emitWithAck("room:join", { code, pseudo: "Nova", preferredColor: "c2" });
    await ask(host).emitWithAck("lobby:start", { force: true });
    await waitForArrival(nova, (arrival) => arrival.kind === "view", GAME_TIMEOUT_MS);
    await ask(nova).emitWithAck("game:action", { type: "ready" });
    nova.emit("game:input", { seq: 5, dx: 0, dy: 0 });
    await waitForNextView(nova, (payload) => viewOf(payload).me?.lastProcessedSeq === 5);

    nova.disconnect();
    await waitForArrival(
      host,
      (arrival) =>
        arrival.kind === "event" &&
        arrival.event.type === "readyChanged" &&
        arrival.event.playerId === novaId &&
        arrival.event.ready === false,
      GAME_TIMEOUT_MS,
    );

    // Back on a new connection, which numbers its inputs from zero again (architecture §6.5).
    const back = await (server as TestServer).connect({ sessionToken });
    back.emit("game:input", { seq: 0, dx: 0, dy: 0 });
    const view = viewOf(
      await waitForNextView(back, (payload) => viewOf(payload).me?.lastProcessedSeq === 0),
    );

    expect(view).toMatchObject({ phase: "preparation", preparationStep: "waiting" });
    expect(view.phase === "preparation" && view.readyPlayerIds.includes(novaId)).toBe(false);
  });
});
