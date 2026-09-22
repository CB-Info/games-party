import type { RegisteredGame } from "../../games/defineGame";
import type { GameInstance, GamePlayer } from "../../games/gameServer.types";

export interface BotRunnerDeps {
  game: RegisteredGame;
  instance: GameInstance<unknown, unknown, unknown>;
  /** Read at each tick: a bot added or removed mid-game must be seen straight away. */
  players: () => readonly GamePlayer[];
  /** Injected so that tests stay reproducible (CLAUDE.md, règle d'or 7). */
  random: () => number;
}

/**
 * Plays every bot of a room, once per tick (docs/architecture.md, §8). A bot is a player like any
 * other as far as the game is concerned: it is handed its own view, and what it decides goes
 * through `onInput` and `onAction` exactly as a person's would.
 */
export class BotRunner {
  private readonly deps: BotRunnerDeps;

  constructor(deps: BotRunnerDeps) {
    this.deps = deps;
  }

  play(dtMs: number): void {
    for (const player of this.deps.players()) {
      if (!player.isBot) {
        continue;
      }

      // Its own view, never another player's: a bot must not see more than it would as a person
      // (CLAUDE.md, règle d'or 2).
      const view = this.deps.instance.getViewFor({ playerId: player.playerId });

      const input = this.deps.game.bot.nextInput(view, player.playerId, dtMs, this.deps.random);
      if (input !== null) {
        this.deps.instance.onInput(player.playerId, input);
      }

      const action = this.deps.game.bot.nextAction(view, player.playerId);
      if (action !== null) {
        this.deps.instance.onAction(player.playerId, action);
      }
    }
  }
}
