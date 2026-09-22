import type { GameMeta } from "./gameMeta";
import type { BotPolicy, GameContext, GameDefinition, GameInstance } from "./gameServer.types";

/**
 * A game registered with the boundaries of its four types erased. The room holds games with
 * different input, action, view and option types in one list, which their own generic shapes make
 * impossible; each of these methods validates with the game's own Zod schema before handing the
 * value over, so the real types are still enforced at runtime.
 */
export interface RegisteredGame {
  meta: GameMeta;
  parseInput(value: unknown): { ok: true; value: unknown } | { ok: false };
  parseAction(value: unknown): { ok: true; value: unknown } | { ok: false };
  parseOptions(value: unknown): { ok: true; value: unknown } | { ok: false };
  defaultOptions(playerCount: number): unknown;
  normalizeOptions(options: unknown, playerCount: number): unknown;
  create(ctx: GameContext, options: unknown): GameInstance<unknown, unknown, unknown>;
  /**
   * How a development bot plays (§8). Its output is not validated: it comes from our own code and
   * never from the network, which is what règle d'or 3 guards against.
   */
  bot: BotPolicy<unknown, unknown, unknown>;
}

/**
 * Erases the type parameters of a game definition. This is the only place in the code where a type
 * assertion is needed: the Zod schemas above guarantee that the erased values really are of the
 * game's own types.
 */
export function defineGame<Input, Action, View, Options>(
  definition: GameDefinition<Input, Action, View, Options>,
): RegisteredGame {
  return {
    meta: definition.meta,
    parseInput: (value) => {
      const result = definition.inputSchema.safeParse(value);
      return result.success ? { ok: true, value: result.data } : { ok: false };
    },
    parseAction: (value) => {
      const result = definition.actionSchema.safeParse(value);
      return result.success ? { ok: true, value: result.data } : { ok: false };
    },
    parseOptions: (value) => {
      const result = definition.optionsSchema.safeParse(value);
      return result.success ? { ok: true, value: result.data } : { ok: false };
    },
    defaultOptions: (playerCount) => definition.defaultOptions(playerCount),
    normalizeOptions: (options, playerCount) =>
      definition.normalizeOptions(options as Options, playerCount),
    create: (ctx, options) =>
      definition.create(ctx, options as Options) as GameInstance<unknown, unknown, unknown>,
    bot: definition.bot as BotPolicy<unknown, unknown, unknown>,
  };
}
