import { z } from "zod";

import { defineGame, type RegisteredGame } from "./defineGame";
import type { GameContext, GameInstance } from "./gameServer.types";

/**
 * A minimal game used by the tests only, never listed in `registry.server.ts`. It scores elapsed
 * time, ends after `durationMs`, and records the calls the room makes on it so that tests can
 * assert on them.
 */

export const FAKE_GAME_ID = "fake-game";
export const OTHER_FAKE_GAME_ID = "other-fake-game";
export const FAKE_GAME_MIN_PLAYERS = 2;
export const FAKE_GAME_MAX_PLAYERS = 4;

const FAKE_DEFAULT_DURATION_MS = 1000;
const FAKE_MIN_DURATION_MS = 100;
const FAKE_MAX_DURATION_MS = 10000;

const inputSchema = z.strictObject({ delta: z.number().finite() });
const actionSchema = z.strictObject({ type: z.literal("score"), amount: z.number().finite() });
const optionsSchema = z.strictObject({ durationMs: z.number().int() });

type FakeInput = z.infer<typeof inputSchema>;
type FakeAction = z.infer<typeof actionSchema>;
type FakeOptions = z.infer<typeof optionsSchema>;

export interface FakeGameView {
  elapsedMs: number;
  scores: Array<{ playerId: string; score: number }>;
  /** A spectator sees the game without being part of it. */
  viewerIsSpectator: boolean;
}

/** The instance is exposed so that tests can read what the room did to it. */
export class FakeGameInstance implements GameInstance<FakeInput, FakeAction, FakeGameView> {
  readonly disconnected: string[] = [];
  readonly reconnected: string[] = [];
  readonly left: string[] = [];
  private readonly scores = new Map<string, number>();
  private readonly ctx: GameContext;
  private readonly durationMs: number;
  private elapsedMs = 0;

  constructor(ctx: GameContext, durationMs: number) {
    this.ctx = ctx;
    this.durationMs = durationMs;

    for (const player of ctx.players()) {
      this.scores.set(player.playerId, 0);
    }
  }

  onInput(playerId: string, input: FakeInput): void {
    this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + input.delta);
  }

  onAction(playerId: string, action: FakeAction): { ok: true } | { ok: false; error: "NOT_HOST" } {
    if (this.ctx.getHostId() !== playerId) {
      return { ok: false, error: "NOT_HOST" };
    }

    this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + action.amount);
    return { ok: true };
  }

  tick(dtMs: number): void {
    this.elapsedMs += dtMs;
  }

  onPlayerDisconnect(playerId: string): void {
    this.disconnected.push(playerId);
  }

  onPlayerReconnect(playerId: string): void {
    this.reconnected.push(playerId);
  }

  onPlayerLeave(playerId: string): void {
    this.left.push(playerId);
    this.scores.delete(playerId);
  }

  getViewFor(viewer: { playerId: string } | { spectator: true }): FakeGameView {
    return {
      elapsedMs: this.elapsedMs,
      scores: [...this.scores].map(([playerId, score]) => ({ playerId, score })),
      viewerIsSpectator: "spectator" in viewer,
    };
  }

  isOver(): boolean {
    return this.elapsedMs >= this.durationMs;
  }

  getRanking(): Array<{ playerId: string; score: number }> {
    return [...this.scores]
      .map(([playerId, score]) => ({ playerId, score }))
      .sort((a, b) => b.score - a.score);
  }
}

/** Set by `create`, so that a test can act on the running instance. */
export let lastFakeGameInstance: FakeGameInstance | null = null;

function createFakeGame(id: string, name: string): RegisteredGame {
  return defineGame<FakeInput, FakeAction, FakeGameView, FakeOptions>({
    id,
    name,
    minPlayers: FAKE_GAME_MIN_PLAYERS,
    maxPlayers: FAKE_GAME_MAX_PLAYERS,
    inputSchema,
    actionSchema,
    optionsSchema,
    defaultOptions: () => ({ durationMs: FAKE_DEFAULT_DURATION_MS }),
    normalizeOptions: (options) => ({
      durationMs: Math.min(
        FAKE_MAX_DURATION_MS,
        Math.max(FAKE_MIN_DURATION_MS, options.durationMs),
      ),
    }),
    create: (ctx, options) => {
      lastFakeGameInstance = new FakeGameInstance(ctx, options.durationMs);
      return lastFakeGameInstance;
    },
    bot: {
      nextInput: () => ({ delta: 1 }),
      nextAction: () => null,
    },
  });
}

export const fakeGame = createFakeGame(FAKE_GAME_ID, "Jeu de test");

/** A second game, so that tests can switch from one to another (docs/architecture.md, §5.8). */
export const otherFakeGame = createFakeGame(OTHER_FAKE_GAME_ID, "Autre jeu de test");
