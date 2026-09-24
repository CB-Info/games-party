import { cursorTagGame } from "./cursor-tag/server/cursorTagDefinition";
import type { RegisteredGame } from "./defineGame";
import { sandboxGame } from "./sandbox/server/sandboxDefinition";

/**
 * Games the host can choose from. The sandbox is a development tool, and must never appear in
 * production (docs/architecture.md, §8). Cursor Tag stays in development too until its screen is
 * there to play it: it goes online at the last sub-step of step 4 (CLAUDE.md, feuille de route).
 */
const GAMES: readonly RegisteredGame[] =
  process.env.NODE_ENV === "production" ? [] : [sandboxGame, cursorTagGame];

export function listGames(): readonly RegisteredGame[] {
  return GAMES;
}

export function findGame(gameId: string): RegisteredGame | null {
  return GAMES.find((game) => game.meta.id === gameId) ?? null;
}
