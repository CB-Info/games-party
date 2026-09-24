import type { Outcome, RoundState, RuleContext } from "./cursorTagState";
import { endRound } from "./roundEnd";
import { countDownTimers, payBacklogs, rechargeBudgets, scoreRunners } from "./roundTickSteps";
import { findContacts } from "./tagContacts";
import { resolveTags } from "./tagResolution";
import { closePaths } from "./tickPaths";

/**
 * One tick of a round, after the room has applied the tick's inputs (rules.md, §6.6). The steps
 * run in the order of the rules, and each one reads what the one before left.
 */
export function playRoundTick(state: RoundState, dtMs: number, rules: RuleContext): Outcome {
  // 1. Timers run down.
  const counted = countDownTimers(state, dtMs);
  // 2. Remainders are paid, through the portals.
  const paid = payBacklogs(counted.players, rules);
  // 3. Connected Runners score the round time this tick used up.
  const elapsedMs = state.timeLeftMs - counted.timeLeftMs;
  const scored = scoreRunners(paid.players, elapsedMs, rules.isConnected);
  // 4. Tags, on the tick's paths, the payment of step 2 included.
  const tagged = resolveTags(scored, findContacts(scored, rules), rules.settings.freezeMs);
  // 5. Budgets for the next tick's inputs.
  const recharged = rechargeBudgets(tagged.players, dtMs);
  // 6. Where everyone stands starts their next path.
  const next: RoundState = { ...counted, players: closePaths(recharged) };
  const events = [...paid.events, ...tagged.events];

  if (next.timeLeftMs > 0) {
    return { state: next, events };
  }

  // 7. The round is over.
  const ended = endRound(next, rules.settings.roundCount);
  return { state: ended.state, events: [...events, ...ended.events] };
}
