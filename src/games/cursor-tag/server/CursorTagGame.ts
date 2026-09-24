import { isNewInput, type CursorInput } from "../../../shared/cursor/cursorInput";
import type { GameContext, GameInstance, GamePlayer } from "../../gameServer.types";
import { buildView, type Viewer } from "../logic/buildView";
import { disconnectPlayer, reconnectPlayer } from "../logic/connections";
import type { TagSettings } from "../logic/cursorTagOptions";
import {
  findPlayer,
  isOver,
  type CursorTagState,
  type Outcome,
  type RuleContext,
} from "../logic/cursorTagState";
import { playTick } from "../logic/cursorTagTick";
import { applyInput } from "../logic/inputs";
import { applyAction, createGame } from "../logic/preparation";
import { finalRanking } from "../logic/ranking";
import { removePlayer } from "../logic/removal";
import type { CursorTagAction } from "../shared/schemas";
import type { CursorTagWireView } from "../shared/types";

/**
 * A game of Cursor Tag as the room runs it (docs/architecture.md, §7). It holds the state, hands
 * every call to the pure rules of `logic/`, and sends the events they return, in their order. It
 * adds no rule of its own: what it does besides is only what the rules cannot know, such as who is
 * a bot or who is connected right now.
 */
export class CursorTagGame implements GameInstance<
  CursorInput,
  CursorTagAction,
  CursorTagWireView
> {
  private readonly ctx: GameContext;
  private readonly rules: RuleContext;
  private state: CursorTagState;

  /**
   * Takes the settings the rules compute in rather than the host's options: the game's definition
   * is the one place that turns the second into the first, so a test can play a shorter round
   * without the game knowing it is a test.
   */
  constructor(ctx: GameContext, settings: TagSettings) {
    this.ctx = ctx;
    this.rules = {
      settings,
      // Read at each call: the room changes a player's connection before it tells the game (§5.5).
      isConnected: (playerId) => this.member(playerId)?.connected ?? false,
      random: () => ctx.random(),
    };
    this.state = createGame(ctx.players().map((player) => player.playerId));
  }

  onInput(playerId: string, input: CursorInput): void {
    const player = findPlayer(this.state.players, playerId);
    if (player === undefined) {
      return;
    }

    // The sequence guard protects a human's inputs from being replayed or reordered by the
    // network. A bot's input never travels, so it carries no sequence number to check (§6.5).
    if (this.member(playerId)?.isBot !== true && !isNewInput(input, player.lastProcessedSeq)) {
      return;
    }

    this.play(applyInput(this.state, playerId, input, this.rules));
  }

  onAction(
    playerId: string,
    action: CursorTagAction,
  ): { ok: true } | { ok: false; error: "INVALID_STATE" } {
    const result = applyAction(this.state, playerId, action, this.rules);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    this.play(result);
    return { ok: true };
  }

  tick(dtMs: number): void {
    this.play(playTick(this.state, dtMs, this.rules));
  }

  /**
   * The room also calls these three for its spectators, who are not players of the game: the
   * rules change nothing for an identifier they do not know, so nothing is filtered here. Nor
   * could it be against `ctx.players()`, which no longer lists a player who is leaving.
   */
  onPlayerDisconnect(playerId: string): void {
    this.play(disconnectPlayer(this.state, playerId, this.rules));
  }

  onPlayerReconnect(playerId: string): void {
    this.state = reconnectPlayer(this.state, playerId);
  }

  onPlayerLeave(playerId: string): void {
    this.play(removePlayer(this.state, playerId, this.rules));
  }

  /**
   * There is no view of a game that is over (rules.md, §8.1): the room shows the results the
   * moment `isOver()` says so, after a tick or after a removal, and asks for no view afterwards
   * (architecture §6.3). Being asked for one means the room broke that contract.
   */
  getViewFor(viewer: Viewer): CursorTagWireView {
    if (this.state.phase === "over") {
      throw new Error("A game of Cursor Tag that is over has no view");
    }

    return buildView(this.state, viewer, this.rules.isConnected);
  }

  isOver(): boolean {
    return isOver(this.state);
  }

  getRanking(): Array<{ playerId: string; score: number }> {
    return finalRanking(this.state.players);
  }

  /** Every event goes to the whole room (rules.md, §9). */
  private play(outcome: Outcome): void {
    this.state = outcome.state;
    for (const event of outcome.events) {
      this.ctx.emitEvent(event);
    }
  }

  private member(playerId: string): GamePlayer | undefined {
    return this.ctx.players().find((player) => player.playerId === playerId);
  }
}
