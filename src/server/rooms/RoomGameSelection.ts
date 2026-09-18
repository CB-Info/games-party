import type { RegisteredGame } from "../../games/defineGame";
import type { ErrorCode } from "../../shared/protocol";
import type { RoomMembers } from "./RoomMembers";
import { RoomOptions } from "./roomOptions";
import type { RoomOutbound } from "./roomOutbound";

interface RoomGameSelectionDeps {
  members: RoomMembers;
  outbound: RoomOutbound;
  findGame: (gameId: string) => RegisteredGame | null;
}

/** Which game the host picked and with which options (docs/architecture.md, §5.3). */
export class RoomGameSelection {
  private readonly deps: RoomGameSelectionDeps;
  private readonly options = new RoomOptions();
  gameId: string | null = null;

  constructor(deps: RoomGameSelectionDeps) {
    this.deps = deps;
  }

  get game(): RegisteredGame | null {
    return this.gameId === null ? null : this.deps.findGame(this.gameId);
  }

  get currentOptions(): unknown {
    return this.gameId === null ? null : this.options.get(this.gameId);
  }

  /** Choosing a different game makes everyone lose their ready status (§5.8). */
  select(gameId: string): ErrorCode | null {
    const game = this.deps.findGame(gameId);
    if (game === null) {
      return "INVALID_PAYLOAD";
    }

    if (this.gameId === gameId) {
      return null;
    }

    const wereReady = this.deps.members.all
      .filter((member) => member.ready)
      .map((member) => member.playerId);

    this.gameId = gameId;
    this.options.select(game, this.deps.members.counting.length);
    this.deps.members.clearReady();

    if (wereReady.length > 0) {
      this.deps.outbound.gameChanged(wereReady, gameId);
    }

    return null;
  }

  /** Changing an option keeps everyone's ready status (§5.8). */
  setOptions(rawOptions: unknown): ErrorCode | null {
    const game = this.game;
    if (game === null) {
      return "NO_GAME_SELECTED";
    }

    const parsed = game.parseOptions(rawOptions);
    if (!parsed.ok) {
      return "INVALID_PAYLOAD";
    }

    this.options.set(game, parsed.value, this.deps.members.counting.length);
    return null;
  }

  /** Options to hand to a starting game, recomputed for the current player count. */
  optionsForStart(game: RegisteredGame): unknown {
    return this.options.select(game, this.deps.members.counting.length);
  }

  /** Recomputes the stored options after the player count changed (§5.3). */
  renormalize(): void {
    const game = this.game;
    if (game !== null) {
      this.options.renormalize(game, this.deps.members.counting.length);
    }
  }
}
