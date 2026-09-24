import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import { PREPARATION_AUTO_START_MS, PREPARATION_COUNTDOWN_MS } from "../shared/constants";
import type { CursorTagAction } from "../shared/schemas";
import {
  findPlayer,
  type ActionResult,
  type CursorTagState,
  type Outcome,
  type PreparationState,
  type RuleContext,
  type TagMember,
} from "./cursorTagState";
import { startRound } from "./roundStart";

/** A game begins with the preparation of its first round, with no cursor yet (rules.md, §4). */
export function createGame(playerIds: readonly string[]): PreparationState {
  return preparationFor(
    1,
    playerIds.map((playerId) => ({ playerId, scoreMs: 0, lastProcessedSeq: NO_SEQ_PROCESSED })),
  );
}

/**
 * The preparation of a round (rules.md, §4.1): nobody is ready yet, and the delay before the
 * automatic start begins. Nothing resets that delay afterwards.
 */
export function preparationFor(round: number, players: TagMember[]): PreparationState {
  return {
    phase: "preparation",
    round,
    players,
    readyIds: [],
    step: { kind: "waiting", autoStartMsLeft: PREPARATION_AUTO_START_MS },
  };
}

/**
 * « Je suis prêt », or the mouse lost during the waiting (rules.md, §4.1). Refused outside the
 * waiting step; accepted without effect when it changes nothing. Becoming ready may be what
 * starts the countdown.
 */
export function applyAction(
  state: CursorTagState,
  playerId: string,
  action: CursorTagAction,
  rules: RuleContext,
): ActionResult {
  if (
    state.phase !== "preparation" ||
    state.step.kind !== "waiting" ||
    findPlayer(state.players, playerId) === undefined
  ) {
    return { ok: false, error: "INVALID_STATE" };
  }

  const wasReady = state.readyIds.includes(playerId);

  if (action.type === "ready") {
    if (wasReady) {
      return { ok: true, state, events: [] };
    }

    const counted = startCountdownIfAllReady(
      { ...state, readyIds: [...state.readyIds, playerId] },
      rules,
    );
    return {
      ok: true,
      state: counted.state,
      events: [{ type: "readyChanged", playerId, ready: true }, ...counted.events],
    };
  }

  if (!wasReady) {
    return { ok: true, state, events: [] };
  }

  return {
    ok: true,
    state: { ...state, readyIds: state.readyIds.filter((id) => id !== playerId) },
    events: [{ type: "readyChanged", playerId, ready: false }],
  };
}

/**
 * Starts the countdown once every connected player is ready, and at least one is connected
 * (rules.md, §4.1). Checked after each `ready`, each disconnection and each removal, so that a
 * player who is away never holds the others back.
 */
export function startCountdownIfAllReady(
  state: PreparationState,
  rules: RuleContext,
): Outcome<PreparationState> {
  const connected = state.players.filter((player) => rules.isConnected(player.playerId));
  const allReady =
    connected.length > 0 && connected.every((player) => state.readyIds.includes(player.playerId));

  return state.step.kind === "waiting" && allReady
    ? startCountdown(state, false)
    : { state, events: [] };
}

/**
 * One tick of a preparation (rules.md, §6.6): the waiting runs down to the automatic countdown,
 * and the countdown, which nothing cancels, down to the round.
 */
export function tickPreparation(
  state: PreparationState,
  dtMs: number,
  rules: RuleContext,
): Outcome {
  if (state.step.kind === "waiting") {
    const autoStartMsLeft = Math.max(0, state.step.autoStartMsLeft - dtMs);
    return autoStartMsLeft === 0
      ? startCountdown(state, true)
      : { state: { ...state, step: { kind: "waiting", autoStartMsLeft } }, events: [] };
  }

  const countdownMsLeft = Math.max(0, state.step.countdownMsLeft - dtMs);
  return countdownMsLeft === 0
    ? startRound(state, rules)
    : { state: { ...state, step: { kind: "countdown", countdownMsLeft } }, events: [] };
}

/** `auto` when the waiting ran out rather than everyone being ready. */
function startCountdown(state: PreparationState, auto: boolean): Outcome<PreparationState> {
  return {
    state: { ...state, step: { kind: "countdown", countdownMsLeft: PREPARATION_COUNTDOWN_MS } },
    events: [{ type: "preparationCountdown", round: state.round, auto }],
  };
}
