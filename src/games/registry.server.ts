import type { RegisteredGame } from "./defineGame";

/** Games the host can choose from. Cursor Tag is added at step 4 (CLAUDE.md, feuille de route). */
const GAMES: readonly RegisteredGame[] = [];

export function listGames(): readonly RegisteredGame[] {
  return GAMES;
}

export function findGame(gameId: string): RegisteredGame | null {
  return GAMES.find((game) => game.meta.id === gameId) ?? null;
}
