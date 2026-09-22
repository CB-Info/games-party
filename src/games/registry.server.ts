import type { RegisteredGame } from "./defineGame";
import { sandboxGame } from "./sandbox/server/sandboxDefinition";

/**
 * Games the host can choose from. Cursor Tag is added at step 4 (CLAUDE.md, feuille de route).
 * The sandbox is a development tool: outside production it is the only way to make a cursor move,
 * and in production it must never appear (docs/architecture.md, §8).
 */
const GAMES: readonly RegisteredGame[] = process.env.NODE_ENV === "production" ? [] : [sandboxGame];

export function listGames(): readonly RegisteredGame[] {
  return GAMES;
}

export function findGame(gameId: string): RegisteredGame | null {
  return GAMES.find((game) => game.meta.id === gameId) ?? null;
}
