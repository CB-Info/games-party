import type { RoundEndEvent } from "../shared/types";
import { toMember, type Outcome, type RoundState } from "./cursorTagState";
import { preparationFor } from "./preparation";

/**
 * Ends a round (rules.md, §4): its time ran out, or no Runner is left. Scores are kept. The game
 * goes on to the next round's preparation, or is over after the last round.
 */
export function endRound(state: RoundState, roundCount: number): Outcome {
  const players = state.players.map(toMember);
  const events: RoundEndEvent[] = [{ type: "roundEnd", round: state.round }];

  return state.round >= roundCount
    ? { state: { phase: "over", players }, events }
    : { state: preparationFor(state.round + 1, players), events };
}
