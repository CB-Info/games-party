import type { Point } from "../../../shared/cursor/collision";
import { budgetCap } from "../../../shared/cursor/moveCursor";
import type { CursorTagEvent } from "../shared/types";
import type { RoundPlayer, RoundState, RuleContext } from "./cursorTagState";
import { TICK_MS, asRound, chat, nearby, runner } from "./cursorTagState.fixture";
import { applyInput } from "./inputs";
import { maxSpeedOf } from "./movement";
import { playRoundTick } from "./roundTick";

/**
 * The chase the rewind tests play (rules.md, §6.3). The Runner runs right, thirty units a tick.
 * The Chat waits above their way, out of reach, then dives on the third tick to within reach of
 * where the Runner ran on the first tick, and far from where they run now: a tag two ticks back,
 * and none on the tick's own paths. Never imported by production code.
 */
export const RUN: Point = { x: 30, y: 0 };
export const DIVE: Point = { x: 0, y: -35 };
export const RUNNER_START = nearby(60);
export const CHASER_WAIT = nearby(75, 55);

/** The three ticks of the chase: two runs, then a run and the dive. */
export const CHASE: Array<Record<string, Point>> = [{ r: RUN }, { r: RUN }, { r: RUN, c: DIVE }];

/** The Chat of the chase, on a full reserve so that nothing but the rules decides the dive. */
export function chaser(changes: Partial<RoundPlayer> = {}): RoundPlayer {
  return chat("c", CHASER_WAIT, { budget: budgetCap(maxSpeedOf("chat")), ...changes });
}

/** The Runner of the chase, on a full reserve. */
export function chased(changes: Partial<RoundPlayer> = {}): RoundPlayer {
  return runner("r", RUNNER_START, { budget: budgetCap(maxSpeedOf("runner")), ...changes });
}

/**
 * Plays ticks one after the other, the way the room does: each tick applies its players' moves
 * as inputs, in the order given, then runs. Every event is kept, in order.
 */
export function playTicks(
  start: RoundState,
  ticks: ReadonlyArray<Record<string, Point>>,
  rules: RuleContext,
): { state: RoundState; events: CursorTagEvent[] } {
  let state = start;
  const events: CursorTagEvent[] = [];

  ticks.forEach((moves, seq) => {
    for (const [playerId, move] of Object.entries(moves)) {
      const applied = applyInput(state, playerId, { seq, dx: move.x, dy: move.y }, rules);
      state = asRound(applied.state);
      events.push(...applied.events);
    }

    const ticked = playRoundTick(state, TICK_MS, rules);
    state = asRound(ticked.state);
    events.push(...ticked.events);
  });

  return { state, events };
}
