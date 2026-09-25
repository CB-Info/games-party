import { useRef } from "react";

import { CaptureVeils } from "../../../client/features/game/components/CaptureVeils";
import { DevHud } from "../../../client/features/game/components/DevHud";
import { useArenaSurface } from "../../../client/features/game/hooks/useArenaSurface";
import { usePointerLock } from "../../../client/features/game/hooks/usePointerLock";
import type { GameScreenProps } from "../../gameClient.types";
import { useSandboxRenderer } from "./hooks/useSandboxRenderer";

/** What losing the mouse costs here: nothing but a still cursor (docs/design-system.md, §11.18). */
export const SANDBOX_PAUSE_WARNING = "Ton curseur ne bouge plus.";

/**
 * The sandbox on screen: the arena, the cursors, and the two veils that ask for the mouse. The
 * arena takes the whole width — the information band and the ranking card of §13 arrive with
 * Cursor Tag at step 4, and inventing them for a development tool would mean unpicking them.
 *
 * A spectator sees neither veil: they have no cursor, so there is no capture to ask for or lose.
 */
export function SandboxScreen({
  viewStore,
  options,
  sendInput,
  me,
  players,
  onLeave,
}: GameScreenProps) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // The canvas is sized by the hook, and the frame around it simply follows: no inline style, so
  // nothing to ask of the tightened style-src (docs/architecture.md, §2).
  const { scaleRef } = useArenaSurface(container, canvas);
  const lock = usePointerLock(canvas);
  const amPlaying = "playerId" in me;

  const { probe, maxSpeed, catchUpMs } = useSandboxRenderer({
    canvas,
    scaleRef,
    locked: lock.locked,
    viewStore,
    options,
    sendInput,
    me,
    players,
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col px-12 pb-10 wide:px-14">
      {/* Outside the measured container: the arena is sized from what is left once the readout
          has taken its place, so a development panel never pushes the canvas off screen. */}
      <DevHud probe={probe} scaleRef={scaleRef} maxSpeed={maxSpeed} catchUpMs={catchUpMs} />

      <div ref={container} className="flex min-h-0 flex-1 items-center justify-center">
        <div className="relative">
          {/* The system cursor is hidden inside the arena: the disc drawn on the canvas is the one
              the player follows (docs/architecture.md, §6.5). */}
          <canvas ref={canvas} className="block cursor-none rounded-xl" />

          <CaptureVeils
            lock={lock}
            playing={amPlaying}
            active
            warning={SANDBOX_PAUSE_WARNING}
            onLeave={onLeave}
          />
        </div>
      </div>
    </main>
  );
}
