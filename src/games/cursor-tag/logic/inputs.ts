import type { CursorInput } from "../../../shared/cursor/cursorInput";
import {
  findPlayer,
  updatePlayer,
  type CursorTagState,
  type Outcome,
  type RuleContext,
} from "./cursorTagState";
import { moveAndTeleport } from "./portals";

/**
 * Applies one input, already known to be new (the caller checks `isNewInput`, which only it can
 * do: bots number their inputs their own way). Its `seq` is recorded in every phase, so that the
 * prediction never replays it (architecture §6.5). The cursor moves only during a round, for a
 * player who is connected and not frozen (rules.md, §6.2, §6.6 and §11); then comes the portal
 * check.
 */
export function applyInput(
  state: CursorTagState,
  playerId: string,
  input: CursorInput,
  rules: RuleContext,
): Outcome {
  if (state.phase !== "round") {
    const players = updatePlayer(state.players, playerId, (player) => ({
      ...player,
      lastProcessedSeq: input.seq,
    }));
    return { state: { ...state, players }, events: [] };
  }

  const player = findPlayer(state.players, playerId);
  if (player === undefined) {
    return { state, events: [] };
  }

  const seen = { ...player, lastProcessedSeq: input.seq };
  if (!rules.isConnected(playerId) || seen.frozenMsLeft > 0) {
    return {
      state: { ...state, players: updatePlayer(state.players, playerId, () => seen) },
      events: [],
    };
  }

  const moved = moveAndTeleport(seen, { x: input.dx, y: input.dy }, rules.settings.catchUpMs);
  return {
    state: { ...state, players: updatePlayer(state.players, playerId, () => moved.player) },
    events: moved.events,
  };
}
