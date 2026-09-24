import { describe, expect, it } from "vitest";

import type { GameContext } from "../../gameServer.types";
import { readView } from "../logic/readView";
import { CHAT_COUNT_MIN, ROUND_DURATION_S_MIN } from "../shared/constants";
import { CURSOR_TAG_META } from "../shared/meta";
import { cursorTagOptionsSchema, type CursorTagOptions } from "../shared/schemas";
import { cursorTagBot } from "./bot";
import { TICK_MS } from "./CursorTagGame.fixture";
import { cursorTagDefinition, cursorTagGame } from "./cursorTagDefinition";

/** Options on a step and inside the bounds, of which each test changes one value. */
const VALID: CursorTagOptions = {
  chatCount: 2,
  roundCount: 3,
  roundDurationS: 60,
  freezeDurationS: 3,
};

/**
 * What the room keeps of options the host sends, as `RoomGameSelection` does: the game's schema
 * first, then its normalisation for the number of players. `null` when the schema turns them down.
 */
function received(options: unknown, playerCount: number): CursorTagOptions | null {
  const parsed = cursorTagGame.parseOptions(options);

  return parsed.ok
    ? cursorTagOptionsSchema.parse(cursorTagGame.normalizeOptions(parsed.value, playerCount))
    : null;
}

describe("Cursor Tag as the room sees it", () => {
  it("is known by the meta the client reads too", () => {
    expect(cursorTagGame.meta).toBe(CURSOR_TAG_META);
  });

  it("brings options within their bounds for the number of players", () => {
    expect(received(VALID, 5)).toEqual(VALID);
    expect(received({ ...VALID, chatCount: 9 }, 5)?.chatCount).toBe(4);
    expect(received({ ...VALID, chatCount: 0 }, 5)?.chatCount).toBe(CHAT_COUNT_MIN);
    expect(received({ ...VALID, roundDurationS: 10 }, 5)?.roundDurationS).toBe(
      ROUND_DURATION_S_MIN,
    );
  });

  it("turns down options its schema does not describe", () => {
    expect(received({ ...VALID, roundCount: 2.5 }, 5)).toBeNull();
    expect(received({ ...VALID, speed: 3 }, 5)).toBeNull();
    expect(received({ chatCount: 1 }, 5)).toBeNull();
  });

  it("accepts the two actions of the preparation, and nothing else", () => {
    expect(cursorTagGame.parseAction({ type: "ready" }).ok).toBe(true);
    expect(cursorTagGame.parseAction({ type: "notReady" }).ok).toBe(true);
    expect(cursorTagGame.parseAction({ type: "tag", playerId: "nova" }).ok).toBe(false);
    expect(cursorTagGame.parseAction({ type: "ready", now: true }).ok).toBe(false);
  });

  it("accepts a cursor input, and nothing else", () => {
    expect(cursorTagGame.parseInput({ seq: 0, dx: 3, dy: -4 }).ok).toBe(true);
    expect(cursorTagGame.parseInput({ seq: 0, x: 800, y: 450 }).ok).toBe(false);
  });

  it("plays a game with the options the host chose", () => {
    const players = ["mika", "nova", "zippy"].map((playerId) => ({
      playerId,
      color: "c1",
      isBot: false,
      connected: true,
    }));
    const ctx: GameContext = {
      players: () => players,
      emitEvent: () => undefined,
      getHostId: () => "mika",
      random: () => 0.42,
    };
    const game = cursorTagDefinition.create(ctx, { ...VALID, roundDurationS: 45 });

    for (const { playerId } of players) {
      game.onAction(playerId, { type: "ready" });
    }
    for (
      let ticks = 0;
      readView(game.getViewFor({ spectator: true })).phase !== "round";
      ticks += 1
    ) {
      expect(ticks).toBeLessThan(200);
      game.tick(TICK_MS);
    }

    expect(readView(game.getViewFor({ spectator: true }))).toMatchObject({
      phase: "round",
      roundTimeLeftMs: 45_000,
    });
  });

  it("gives the bots their policy", () => {
    expect(cursorTagGame.bot).toBe(cursorTagBot);
  });
});
