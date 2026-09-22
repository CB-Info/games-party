import type { RegisteredGame } from "../../games/defineGame";

/**
 * Options of every game the host has already chosen. Coming back to a game restores its last
 * options rather than resetting them (docs/architecture.md, §5.3). They disappear with the room.
 */
export class RoomOptions {
  private readonly byGameId = new Map<string, unknown>();

  /**
   * Options to use for a game: its defaults the first time, its last ones afterwards. Either way
   * they go through `normalizeOptions`, since the player count may have changed.
   */
  select(game: RegisteredGame, playerCount: number): unknown {
    const stored = this.byGameId.get(game.meta.id);
    const base = stored ?? game.defaultOptions(playerCount);
    const normalized = game.normalizeOptions(base, playerCount);

    this.byGameId.set(game.meta.id, normalized);
    return normalized;
  }

  /** Applies options sent by the host, after validation by the game's own schema. */
  set(game: RegisteredGame, options: unknown, playerCount: number): unknown {
    const normalized = game.normalizeOptions(options, playerCount);

    this.byGameId.set(game.meta.id, normalized);
    return normalized;
  }

  /** Recomputes the stored options of a game, after the player count changed. */
  renormalize(game: RegisteredGame, playerCount: number): unknown {
    return this.select(game, playerCount);
  }

  get(gameId: string): unknown {
    return this.byGameId.get(gameId) ?? null;
  }
}
