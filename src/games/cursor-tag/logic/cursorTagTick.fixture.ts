import type { CursorInput } from "../../../shared/cursor/cursorInput";
import type { GameEvent } from "../../../shared/protocol";
import type { CursorTagAction } from "../shared/schemas";
import type { TagSettings } from "./cursorTagOptions";
import type { CursorTagState, Outcome } from "./cursorTagState";
import { TICK_MS, rulesWith } from "./cursorTagState.fixture";
import { playTick } from "./cursorTagTick";
import { applyInput } from "./inputs";
import { applyAction, createGame } from "./preparation";

/**
 * Plays a whole game through the rules, the way the server's game class will: one state, and
 * every event sent in order. Events are kept as `GameEvent`s, which is what the room sends, so
 * that a Cursor Tag event the room could not send fails to compile here. Never imported by
 * production code.
 */
export interface GamePilot {
  readonly state: CursorTagState;
  readonly events: GameEvent[];
  tick(dtMs?: number): void;
  act(playerId: string, action: CursorTagAction): void;
  input(playerId: string, input: CursorInput): void;
  /** Ticks until the state matches, and fails the test past `maxTicks`. */
  tickUntil(done: (state: CursorTagState) => boolean, maxTicks: number): void;
}

export function pilotGame(
  playerIds: readonly string[],
  context: { settings?: TagSettings; random?: () => number } = {},
): GamePilot {
  const rules = rulesWith(context);
  let state: CursorTagState = createGame(playerIds);
  const events: GameEvent[] = [];

  function take(outcome: Outcome): void {
    state = outcome.state;
    events.push(...outcome.events);
  }

  const pilot: GamePilot = {
    get state() {
      return state;
    },
    events,
    tick: (dtMs = TICK_MS) => take(playTick(state, dtMs, rules)),
    act: (playerId, action) => {
      const result = applyAction(state, playerId, action, rules);
      if (result.ok) {
        take(result);
      }
    },
    input: (playerId, input) => take(applyInput(state, playerId, input, rules)),
    tickUntil: (done, maxTicks) => {
      for (let ticks = 0; !done(state); ticks += 1) {
        if (ticks >= maxTicks) {
          throw new Error(`still in the ${state.phase} phase after ${maxTicks} ticks`);
        }
        pilot.tick();
      }
    },
  };

  return pilot;
}
