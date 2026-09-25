import { VIEW_STATE_CHAT_OR_READY, VIEW_STATE_CONNECTED } from "../shared/constants";
import type { CursorTagMe, CursorTagView, CursorTagWireView, WireMe } from "../shared/types";

/**
 * The compact view, read back into the form of rules.md §8.1. This is where a Cursor Tag view is
 * read, and nowhere else: by the bots now, and by the client's screen.
 */
export function readView(view: CursorTagWireView): CursorTagView {
  const me = view.m === undefined ? null : readMe(view.m);

  if (view.ph === 1) {
    return {
      phase: "round",
      round: view.r,
      roundTimeLeftMs: view.t,
      players: view.p.map(([playerId, x, y, state, frozenMsLeft, scoreMs]) => ({
        playerId,
        x,
        y,
        role: hasBit(state, VIEW_STATE_CHAT_OR_READY) ? "chat" : "runner",
        frozenMsLeft,
        connected: hasBit(state, VIEW_STATE_CONNECTED),
        scoreMs,
      })),
      me,
    };
  }

  // The key present tells the step: the delay before the automatic start, or the countdown.
  const waiting = "a" in view;

  return {
    phase: "preparation",
    round: view.r,
    preparationStep: waiting ? "waiting" : "countdown",
    autoStartMsLeft: waiting ? view.a : null,
    countdownMsLeft: waiting ? null : view.c,
    readyPlayerIds: view.p
      .filter(([, state]) => hasBit(state, VIEW_STATE_CHAT_OR_READY))
      .map(([playerId]) => playerId),
    players: view.p.map(([playerId, state, scoreMs]) => ({
      playerId,
      connected: hasBit(state, VIEW_STATE_CONNECTED),
      scoreMs,
    })),
    me,
  };
}

/** A remainder the view does not carry is nil (rules.md, §8.2). */
function readMe([
  lastProcessedSeq,
  budget,
  cooldownA,
  cooldownB,
  x = 0,
  y = 0,
]: WireMe): CursorTagMe {
  return {
    lastProcessedSeq,
    budget,
    portalCooldownMs: { A: cooldownA, B: cooldownB },
    backlog: { x, y },
  };
}

function hasBit(state: number, bit: number): boolean {
  return (state & bit) !== 0;
}
