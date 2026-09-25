/** Which veil asks for the mouse, if any (docs/design-system.md, §11.18 and §12). */
export type CaptureVeil = "invite" | "resume" | null;

export interface CaptureSituation {
  /** A spectator has no cursor, so there is no capture to ask for or to lose. */
  playing: boolean;
  /** Whether the game wants the mouse right now: Cursor Tag does not between two rounds. */
  active: boolean;
  /** True until the mouse has been captured at least once in this game. */
  neverCaptured: boolean;
  locked: boolean;
}

/**
 * The veil laid over the arena to ask for the mouse. The invitation while it has never been
 * captured in this game — a player who arrives has lost nothing and does not know yet that a click
 * starts the cursor — and « Clique pour reprendre » once it has been, which warns rather than
 * invites (§11.18).
 */
export function captureVeilFor(situation: CaptureSituation): CaptureVeil {
  if (!situation.playing || !situation.active || situation.locked) {
    return null;
  }

  return situation.neverCaptured ? "invite" : "resume";
}
