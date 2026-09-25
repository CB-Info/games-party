import { captureVeilFor } from "../../../utils/captureVeil";
import type { PointerLockState } from "../hooks/usePointerLock";
import { CaptureInvite } from "./CaptureInvite";
import { PauseOverlay } from "./PauseOverlay";

interface CaptureVeilsProps {
  lock: PointerLockState;
  /** False for a spectator, who has no cursor and sees neither veil (§11.18). */
  playing: boolean;
  /** False while the game wants no mouse, as Cursor Tag between two rounds. */
  active: boolean;
  /** What losing the mouse costs, in the game's own words (docs/design-system.md, §11.18). */
  warning: string;
  onLeave: () => void;
}

/**
 * The veil that asks a player for the mouse, if one is needed (docs/design-system.md, §11.18 and
 * §12): the invitation until the first capture, then « Clique pour reprendre » whenever it is
 * lost. It needs a positioned parent, since a veil covers the arena and nothing else (§11.19).
 */
export function CaptureVeils({ lock, playing, active, warning, onLeave }: CaptureVeilsProps) {
  const veil = captureVeilFor({
    playing,
    active,
    neverCaptured: lock.neverCaptured,
    locked: lock.locked,
  });

  if (veil === "invite") {
    return <CaptureInvite onCapture={lock.request} />;
  }

  if (veil === "resume") {
    return <PauseOverlay warning={warning} onResume={lock.request} onLeave={onLeave} />;
  }

  return null;
}
