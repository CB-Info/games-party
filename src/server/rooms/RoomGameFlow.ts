import { RESULTS_AUTO_RETURN_MS } from "../../shared/constants";
import type { ErrorCode } from "../../shared/protocol";
import type { CumulativeStanding, GameResults, RoomStatus } from "../../shared/types";
import { GameSession } from "./GameSession";
import { RoomGameSelection } from "./RoomGameSelection";
import { buildGameResults } from "./buildGameResults";
import type { RoomGameFlowDeps } from "./roomGameFlowDeps";
import { checkStartConditions } from "./roomStateMachine";

/**
 * The game side of a room: which game is selected, its options, the running game and the
 * leaderboard it feeds. The room itself only keeps its members.
 */
export class RoomGameFlow {
  private readonly deps: RoomGameFlowDeps;
  private readonly selection: RoomGameSelection;
  status: RoomStatus = "lobby";
  cumulative: CumulativeStanding[] = [];
  lastResults: GameResults | null = null;
  private session: GameSession | null = null;
  private resultsTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: RoomGameFlowDeps) {
    this.deps = deps;
    this.selection = new RoomGameSelection(deps);
  }

  get selectedGameId(): string | null {
    return this.selection.gameId;
  }

  get selectedGameOptions(): unknown {
    return this.selection.currentOptions;
  }

  selectGame(gameId: string): ErrorCode | null {
    const refusal = this.selection.select(gameId);
    if (refusal === null) {
      this.deps.onChange();
    }
    return refusal;
  }

  setOptions(rawOptions: unknown): ErrorCode | null {
    const refusal = this.selection.setOptions(rawOptions);
    if (refusal === null) {
      this.deps.onChange();
    }
    return refusal;
  }

  /** Starts the game, once the three conditions of §5.3 are met. */
  start(force: boolean): ErrorCode | null {
    const game = this.selection.game;
    const refusal = checkStartConditions({
      status: this.status,
      selectedGameId: this.selection.gameId,
      minPlayers: game?.meta.minPlayers ?? 0,
      maxPlayers: game?.meta.maxPlayers ?? 0,
      players: this.deps.members.counting,
      hostId: this.deps.members.host,
      force,
    });

    if (refusal !== null) {
      return refusal;
    }

    if (game === null) {
      return "NO_GAME_SELECTED";
    }

    this.status = "playing";
    this.lastResults = null;
    this.session = new GameSession({
      game,
      options: this.selection.optionsForStart(game),
      players: () => this.deps.members.toGamePlayers(),
      spectators: () => this.deps.members.connectedSpectatorIds,
      getHostId: () => this.deps.members.host,
      outbound: this.deps.outbound,
      random: this.deps.random,
      now: this.deps.now,
    });

    this.session.start(() => this.finish());
    this.deps.onChange();
    return null;
  }

  backToLobby(): ErrorCode | null {
    if (this.status !== "results") {
      return "INVALID_STATE";
    }

    this.enterLobby();
    return null;
  }

  queueInput(playerId: string, rawInput: unknown): void {
    if (this.status === "playing") {
      this.session?.queueInput(playerId, rawInput);
    }
  }

  applyAction(playerId: string, rawAction: unknown): ErrorCode | null {
    if (this.status !== "playing" || this.session === null) {
      return "INVALID_STATE";
    }

    const result = this.session.applyAction(playerId, rawAction);
    return result.ok ? null : result.error;
  }

  /** The running game, so that the room can forward its membership changes (§5.5). */
  get instance(): GameSession["instance"] | null {
    return this.session?.instance ?? null;
  }

  /**
   * Checked after every tick and after every removal: a game can end outside a tick (§6.3). Below
   * the game's minimum the game stops at once and nobody scores (§5.2).
   */
  settleAfterRemoval(): void {
    if (this.status !== "playing" || this.session === null) {
      return;
    }

    const game = this.selection.game;
    if (game !== null && this.deps.members.counting.length < game.meta.minPlayers) {
      this.session.stop();
      this.session = null;
      this.deps.outbound.gameEvent({ type: "aborted" });
      this.enterLobby();
      return;
    }

    if (this.session.instance.isOver()) {
      this.finish();
    }
  }

  /** Recomputes the options of the selected game, after the player count changed (§5.3). */
  renormalizeOptions(): void {
    this.selection.renormalize();
  }

  dispose(): void {
    this.session?.stop();
    this.session = null;
    this.clearResultsTimer();
  }

  /** Turns the game's ranking into points and moves the room to its results (§5.6). */
  private finish(): void {
    if (this.session === null) {
      return;
    }

    const ranking = this.session.instance.getRanking();
    this.session.stop();
    this.session = null;

    const { results, awarded } = buildGameResults(ranking, this.deps.members.counting);
    for (const member of this.deps.members.counting) {
      member.points += awarded.get(member.playerId) ?? 0;
    }

    this.cumulative = results.cumulative;
    this.lastResults = results;
    this.status = "results";
    this.deps.outbound.gameResults(results);

    const delay = this.deps.resultsAutoReturnMs ?? RESULTS_AUTO_RETURN_MS;
    this.resultsTimer = setTimeout(() => this.enterLobby(), delay);
    this.deps.onChange();
  }

  /** Entering the lobby: spectators become players and everyone starts not ready (§5.4, §5.8). */
  private enterLobby(): void {
    this.clearResultsTimer();
    this.status = "lobby";
    this.deps.members.promoteSpectators();
    this.deps.members.clearReady();
    this.renormalizeOptions();
    this.deps.onChange();
  }

  private clearResultsTimer(): void {
    if (this.resultsTimer !== null) {
      clearTimeout(this.resultsTimer);
      this.resultsTimer = null;
    }
  }
}
