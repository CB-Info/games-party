import type { CursorTagState, Outcome, RuleContext } from "./cursorTagState";
import { tickPreparation } from "./preparation";
import { playRoundTick } from "./roundTick";

/**
 * One tick of the game, whatever its phase (rules.md, §6.6): the single entry point the server's
 * game class calls, after applying the tick's inputs. Nothing happens once the game is over.
 */
export function playTick(state: CursorTagState, dtMs: number, rules: RuleContext): Outcome {
  switch (state.phase) {
    case "preparation":
      return tickPreparation(state, dtMs, rules);
    case "round":
      return playRoundTick(state, dtMs, rules);
    case "over":
      return { state, events: [] };
  }
}
