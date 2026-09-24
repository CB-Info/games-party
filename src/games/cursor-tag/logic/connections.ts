import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import type { ReadyChangedEvent } from "../shared/types";
import { replaceDepartedChat } from "./chatReplacement";
import {
  findPlayer,
  updatePlayer,
  type CursorTagState,
  type Outcome,
  type RuleContext,
} from "./cursorTagState";
import { startCountdownIfAllReady } from "./preparation";

/**
 * A player lost their connection (rules.md, §4.1 and §11). Called once the room knows it:
 * `rules.isConnected` already says they are away.
 *
 * During the waiting, they are no longer ready, and may have been the last one the others were
 * waiting for. During a round, a Chat may be replaced; a Chat who is not stays a Chat while away,
 * unable to tag, and a Runner stays where they are, out of reach and no longer scoring. Nobody is
 * replaced during a preparation: nobody has a role then.
 */
export function disconnectPlayer(
  state: CursorTagState,
  playerId: string,
  rules: RuleContext,
): Outcome {
  if (state.phase === "preparation") {
    if (state.step.kind !== "waiting") {
      return { state, events: [] };
    }

    const wasReady = state.readyIds.includes(playerId);
    const notReady = { ...state, readyIds: state.readyIds.filter((id) => id !== playerId) };
    const counted = startCountdownIfAllReady(notReady, rules);
    const unready: ReadyChangedEvent[] = wasReady
      ? [{ type: "readyChanged", playerId, ready: false }]
      : [];
    return { state: counted.state, events: [...unready, ...counted.events] };
  }

  if (state.phase === "round" && findPlayer(state.players, playerId)?.role === "chat") {
    return replaceDepartedChat(state, playerId, rules);
  }

  return { state, events: [] };
}

/**
 * A player has a new connection (rules.md, §11): back within the grace delay, or taking their own
 * seat over from another tab. The same for the game in both cases: the new connection numbers its
 * inputs from zero, and starts with nothing in hand and nothing owed. Position, role, score and
 * ready status are kept: after a real disconnection, the ready status was already lost; after a
 * takeover, nothing that happens to a player who leaves applies.
 */
export function reconnectPlayer(state: CursorTagState, playerId: string): CursorTagState {
  if (state.phase !== "round") {
    const players = updatePlayer(state.players, playerId, (player) => ({
      ...player,
      lastProcessedSeq: NO_SEQ_PROCESSED,
    }));
    return { ...state, players };
  }

  const players = updatePlayer(state.players, playerId, (player) => ({
    ...player,
    lastProcessedSeq: NO_SEQ_PROCESSED,
    budget: 0,
    backlog: { x: 0, y: 0 },
  }));
  return { ...state, players };
}
