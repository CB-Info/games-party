import type { RegisteredGame } from "../../games/defineGame";
import type { GameContext, GameInstance, GamePlayer } from "../../games/gameServer.types";
import { MAX_TICK_DT_MS, SERVER_TICK_RATE } from "../../shared/constants";
import type { GameEvent } from "../../shared/protocol";
import { BotRunner } from "../bots/BotRunner";
import type { RoomOutbound } from "./roomOutbound";

interface GameSessionOptions {
  game: RegisteredGame;
  options: unknown;
  /** Players of the game, read live so that a game always sees the current list (§7). */
  players: () => readonly GamePlayer[];
  /** Connected spectators, who watch without playing and get a view of their own (§6.3). */
  spectators: () => readonly string[];
  getHostId: () => string | null;
  outbound: RoomOutbound;
  /** Injected so that tests stay reproducible (règle d'or 7). */
  random: () => number;
  /** Injected so that tests can stop time. */
  now: () => number;
}

/** One running game: its instance, the loop that drives it, and the views it sends. */
export class GameSession {
  readonly instance: GameInstance<unknown, unknown, unknown>;
  private readonly game: RegisteredGame;
  private readonly players: () => readonly GamePlayer[];
  private readonly spectators: () => readonly string[];
  private readonly bots: BotRunner;
  private readonly outbound: RoomOutbound;
  private readonly now: () => number;
  private readonly pendingInputs: Array<{ playerId: string; input: unknown }> = [];
  private loop: ReturnType<typeof setInterval> | null = null;
  private lastTickAt: number;
  private tickNumber = 0;

  constructor({
    game,
    options,
    players,
    spectators,
    getHostId,
    outbound,
    random,
    now,
  }: GameSessionOptions) {
    this.game = game;
    this.players = players;
    this.spectators = spectators;
    this.outbound = outbound;
    this.now = now;
    this.lastTickAt = now();

    const ctx: GameContext = {
      players: () => this.players(),
      emitEvent: (event: GameEvent, to?: string[]) => outbound.gameEvent(event, to),
      getHostId,
      random,
    };

    this.instance = game.create(ctx, options);
    this.bots = new BotRunner({ game, instance: this.instance, players, random });
  }

  /** Starts the loop. `onOver` fires as soon as the game reports it is finished (§6.3). */
  start(onOver: () => void): void {
    this.loop = setInterval(() => {
      const now = this.now();
      const dt = Math.min(now - this.lastTickAt, MAX_TICK_DT_MS);
      this.lastTickAt = now;

      if (this.tickOnce(dt)) {
        onOver();
      }
    }, 1000 / SERVER_TICK_RATE);
  }

  stop(): void {
    if (this.loop !== null) {
      clearInterval(this.loop);
      this.loop = null;
    }
  }

  /**
   * One step of the loop, exposed so that tests drive it without a timer. Applies the inputs
   * received since the previous tick in their arrival order, ticks the game, and either reports
   * that it is over or sends every player and every spectator their own view (§6.3).
   */
  tickOnce(dtMs: number): boolean {
    // Bots decide from the state the last view showed, then their inputs join the others: as far
    // as the game is concerned a bot is a player like any other (§8).
    this.bots.play(dtMs);

    for (const { playerId, input } of this.pendingInputs) {
      this.instance.onInput(playerId, input);
    }
    this.pendingInputs.length = 0;

    this.instance.tick(dtMs);
    this.tickNumber += 1;

    if (this.instance.isOver()) {
      return true;
    }

    this.sendViews(this.spectators());
    return false;
  }

  /** Queues an input, already validated by the game's own schema (règle d'or 3). */
  queueInput(playerId: string, rawInput: unknown): void {
    const parsed = this.game.parseInput(rawInput);
    if (parsed.ok) {
      this.pendingInputs.push({ playerId, input: parsed.value });
    }
  }

  /** Applies an action right away: unlike an input, it must not be lost (§6.2). */
  applyAction(
    playerId: string,
    rawAction: unknown,
  ): { ok: true } | { ok: false; error: "INVALID_PAYLOAD" | "INVALID_STATE" | "NOT_HOST" } {
    const parsed = this.game.parseAction(rawAction);
    if (!parsed.ok) {
      return { ok: false, error: "INVALID_PAYLOAD" };
    }

    return this.instance.onAction(playerId, parsed.value);
  }

  /** Sends each connected player and each spectator the view they are allowed to see (§6.3). */
  sendViews(spectatorIds: readonly string[] = []): void {
    const payload = { tick: this.tickNumber, serverTime: this.now() };

    for (const player of this.players()) {
      if (player.connected) {
        const view = this.instance.getViewFor({ playerId: player.playerId });
        this.outbound.gameView(player.playerId, { ...payload, view });
      }
    }

    for (const spectatorId of spectatorIds) {
      const view = this.instance.getViewFor({ spectator: true });
      this.outbound.gameView(spectatorId, { ...payload, view });
    }
  }
}
