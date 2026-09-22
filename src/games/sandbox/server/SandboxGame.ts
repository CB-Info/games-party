import { NO_SEQ_PROCESSED, isNewInput, type CursorInput } from "../../../shared/cursor/cursorInput";
// The point of the sandbox is to try the engine on the real arena, so it reads the map of the game
// next door. It is the only import from one game to another, and it is deliberate.
import { SPAWN_POINTS, WALLS } from "../../cursor-tag/shared/map";
import type { GameContext, GamePlayer, GameInstance } from "../../gameServer.types";
import {
  applyInput,
  rechargePlayers,
  roundPosition,
  spawnPlayers,
  type SandboxPlayer,
} from "../logic/sandboxState";
import type { SandboxOptions } from "../shared/schemas";
import type { SandboxView } from "../shared/types";

/**
 * Cursors that move, walls that stop them, a timer. Nothing else: it exists to prove the engine
 * works before Cursor Tag brings its own rules (CLAUDE.md, feuille de route).
 */
export class SandboxGame implements GameInstance<CursorInput, never, SandboxView> {
  private readonly ctx: GameContext;
  private players: SandboxPlayer[];
  private timeLeftMs: number;

  constructor(ctx: GameContext, options: SandboxOptions) {
    this.ctx = ctx;
    this.timeLeftMs = options.durationS * 1000;
    this.players = spawnPlayers(
      ctx.players().map((player) => player.playerId),
      SPAWN_POINTS,
      ctx.random,
    );
  }

  onInput(playerId: string, input: CursorInput): void {
    const index = this.players.findIndex((player) => player.playerId === playerId);
    const player = this.players[index];
    if (player === undefined) {
      return;
    }

    // The sequence guard protects a human's inputs from being replayed or reordered by the
    // network. A bot's input never travels, so it carries no sequence number to check (§6.5).
    const member = this.member(playerId);
    if (member?.isBot !== true && !isNewInput(input, player.lastProcessedSeq)) {
      return;
    }

    this.players[index] = applyInput(player, input, WALLS, member?.connected ?? false);
  }

  /** The sandbox has no action: nothing a player could ask for outside their own movement. */
  onAction(): { ok: false; error: "INVALID_STATE" } {
    return { ok: false, error: "INVALID_STATE" };
  }

  tick(dtMs: number): void {
    this.timeLeftMs = Math.max(0, this.timeLeftMs - dtMs);
    this.players = rechargePlayers(this.players, dtMs);
  }

  /** The cursor stays where it is; the view says it is away and the clients stop drawing it. */
  onPlayerDisconnect(): void {
    // Nothing to undo: the seat is kept, and the position with it (docs/architecture.md, §5.5).
  }

  /** A returning client counts from zero again, so the server must forget what it saw (§6.5). */
  onPlayerReconnect(playerId: string): void {
    const index = this.players.findIndex((player) => player.playerId === playerId);
    const player = this.players[index];

    if (player !== undefined) {
      this.players[index] = { ...player, lastProcessedSeq: NO_SEQ_PROCESSED, budget: 0 };
    }
  }

  onPlayerLeave(playerId: string): void {
    this.players = this.players.filter((player) => player.playerId !== playerId);
  }

  getViewFor(viewer: { playerId: string } | { spectator: true }): SandboxView {
    const me = "playerId" in viewer ? this.find(viewer.playerId) : undefined;

    return {
      timeLeftMs: Math.round(this.timeLeftMs),
      players: this.players.map((player) => ({
        playerId: player.playerId,
        x: roundPosition(player.position.x),
        y: roundPosition(player.position.y),
        connected: this.member(player.playerId)?.connected ?? false,
        distance: Math.round(player.distance),
      })),
      me: me === undefined ? null : { lastProcessedSeq: me.lastProcessedSeq, budget: me.budget },
    };
  }

  isOver(): boolean {
    return this.timeLeftMs <= 0;
  }

  getRanking(): Array<{ playerId: string; score: number }> {
    return this.players
      .map((player) => ({ playerId: player.playerId, score: Math.round(player.distance) }))
      .sort((a, b) => b.score - a.score);
  }

  private find(playerId: string): SandboxPlayer | undefined {
    return this.players.find((player) => player.playerId === playerId);
  }

  private member(playerId: string): GamePlayer | undefined {
    return this.ctx.players().find((player) => player.playerId === playerId);
  }
}
