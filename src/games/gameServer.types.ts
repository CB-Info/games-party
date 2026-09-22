import type { z } from "zod";

import type { GameEvent } from "../shared/protocol";
import type { GameMeta } from "./gameMeta";

/** A player of the running game, as the game sees them (docs/architecture.md, §7). */
export interface GamePlayer {
  playerId: string;
  color: string;
  isBot: boolean;
  connected: boolean;
}

/** What a game may ask of the room it runs in (docs/architecture.md, §7). */
export interface GameContext {
  /**
   * Players still in the game, with their current connection state. Read at each call rather than
   * captured once: a game needs the live list, for instance to count how many players are
   * connected at the start of a round.
   */
  players(): readonly GamePlayer[];
  /** Sends `game:event`, to the whole room when `to` is absent. */
  emitEvent(event: GameEvent, to?: string[]): void;
  /** Current host of the room, which may change during a game. */
  getHostId(): string | null;
  /** A number in [0, 1). Games never call `Math.random` (règle d'or 7). */
  random(): number;
}

/** A game being played. One instance per game, created when the host starts it. */
export interface GameInstance<Input, Action, View> {
  onInput(playerId: string, input: Input): void;
  onAction(
    playerId: string,
    action: Action,
  ): { ok: true } | { ok: false; error: "INVALID_STATE" | "NOT_HOST" };
  tick(dtMs: number): void;
  onPlayerDisconnect(playerId: string): void;
  onPlayerReconnect(playerId: string): void;
  onPlayerLeave(playerId: string): void;
  getViewFor(viewer: { playerId: string } | { spectator: true }): View;
  isOver(): boolean;
  /** Players still in the game, sorted by decreasing score. */
  getRanking(): Array<{ playerId: string; score: number }>;
}

/** How a development bot plays (docs/architecture.md, §8). */
export interface BotPolicy<Input, Action, View> {
  nextInput(view: View, botPlayerId: string, dtMs: number, random: () => number): Input | null;
  nextAction(view: View, botPlayerId: string): Action | null;
}

/** Everything the room needs to run a game (docs/architecture.md, §7). */
export interface GameDefinition<Input, Action, View, Options> {
  /** Name, description and bounds, shared with the client definition (§7). */
  meta: GameMeta;
  inputSchema: z.ZodType<Input>;
  actionSchema: z.ZodType<Action>;
  optionsSchema: z.ZodType<Options>;
  defaultOptions(playerCount: number): Options;
  /** Brings options back inside their valid range for the current player count. */
  normalizeOptions(options: Options, playerCount: number): Options;
  create(ctx: GameContext, options: Options): GameInstance<Input, Action, View>;
  bot: BotPolicy<Input, Action, View>;
}
