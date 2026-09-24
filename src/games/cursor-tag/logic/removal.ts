import { MIN_PLAYERS } from "../shared/constants";
import { replaceDepartedChat } from "./chatReplacement";
import {
  findPlayer,
  type CursorTagState,
  type Outcome,
  type PreparationState,
  type RoundState,
  type RuleContext,
  type TagMember,
} from "./cursorTagState";
import { startCountdownIfAllReady } from "./preparation";
import { endRound } from "./roundEnd";

/**
 * A player leaves the game for good (rules.md, §11): « Quitter la room », a bot removed by the
 * host, or the end of the grace delay. They disappear from the view and from the ranking.
 *
 * Below `MIN_PLAYERS`, the room abandons the game, and nothing else happens here: an event sent
 * now would reach players who are about to see the game stop.
 */
export function removePlayer(state: CursorTagState, playerId: string, rules: RuleContext): Outcome {
  if (findPlayer(state.players, playerId) === undefined) {
    return { state, events: [] };
  }

  switch (state.phase) {
    case "preparation":
      return removeFromPreparation(state, playerId, rules);
    case "round":
      return removeFromRound(state, playerId, rules);
    case "over":
      return { state: { ...state, players: without(state.players, playerId) }, events: [] };
  }
}

/**
 * A ready player leaves the ready list with no `readyChanged`: they are no longer a player
 * (rules.md, §4.1). The others may all be ready now.
 */
function removeFromPreparation(
  state: PreparationState,
  playerId: string,
  rules: RuleContext,
): Outcome {
  const remaining = {
    ...state,
    players: without(state.players, playerId),
    readyIds: state.readyIds.filter((id) => id !== playerId),
  };

  return remaining.players.length < MIN_PLAYERS
    ? { state: remaining, events: [] }
    : startCountdownIfAllReady(remaining, rules);
}

/** A Chat may be replaced, and a round left without a single Runner ends at once (rules.md, §4). */
function removeFromRound(state: RoundState, playerId: string, rules: RuleContext): Outcome {
  const wasChat = findPlayer(state.players, playerId)?.role === "chat";
  const remaining = { ...state, players: without(state.players, playerId) };
  if (remaining.players.length < MIN_PLAYERS) {
    return { state: remaining, events: [] };
  }

  const replaced = wasChat
    ? replaceDepartedChat(remaining, playerId, rules)
    : { state: remaining, events: [] };
  if (replaced.state.players.some((player) => player.role === "runner")) {
    return replaced;
  }

  const ended = endRound(replaced.state, rules.settings.roundCount);
  return { state: ended.state, events: [...replaced.events, ...ended.events] };
}

function without<Player extends TagMember>(players: readonly Player[], playerId: string): Player[] {
  return players.filter((player) => player.playerId !== playerId);
}
