import { useRef } from "react";

import { CaptureVeils } from "../../../client/features/game/components/CaptureVeils";
import { DevHud } from "../../../client/features/game/components/DevHud";
import { useArenaSurface } from "../../../client/features/game/hooks/useArenaSurface";
import { usePointerLock } from "../../../client/features/game/hooks/usePointerLock";
import type { GameScreenProps } from "../../gameClient.types";
import { maxSpeedOf } from "../logic/movement";
import { useCursorTagRenderer } from "./hooks/useCursorTagRenderer";
import { useTagRoundState } from "./hooks/useTagRoundState";
import { pauseWarningFor } from "./pauseWarning";

/**
 * Cursor Tag on screen: the arena, the cursors, and the veils that ask for the mouse — during a
 * round only, since between two rounds nobody moves and the mouse is released (rules.md, §4.1).
 * The information band and the live ranking arrive with the next sub-step.
 *
 * A spectator sees no veil: they have no cursor, so there is no capture to ask for or lose.
 */
export function CursorTagScreen({
  viewStore,
  options,
  sendInput,
  me,
  players,
  onLeave,
}: GameScreenProps) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const { scaleRef } = useArenaSurface(container, canvas);
  const lock = usePointerLock(canvas);
  const round = useTagRoundState();
  const inRound = round.phase === "round";
  const role = round.role ?? "runner";

  const { probe, catchUpMs } = useCursorTagRenderer({
    canvas,
    scaleRef,
    locked: lock.locked,
    viewStore,
    options,
    sendInput,
    me,
    players,
    report: round.report,
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col px-12 pb-10 wide:px-14">
      {/* The readout's ceiling follows the role, as the prediction's speed does (rules.md, §6.2). */}
      <DevHud probe={probe} scaleRef={scaleRef} maxSpeed={maxSpeedOf(role)} catchUpMs={catchUpMs} />

      <div ref={container} className="flex min-h-0 flex-1 items-center justify-center">
        <div className="relative">
          {/* The system cursor hides only while a round needs the drawn one (§6.5): between two
              rounds nothing is drawn under the pointer. */}
          <canvas ref={canvas} className={`block rounded-xl ${inRound ? "cursor-none" : ""}`} />

          <CaptureVeils
            lock={lock}
            playing={"playerId" in me}
            active={inRound}
            warning={pauseWarningFor(role)}
            onLeave={onLeave}
          />
        </div>
      </div>
    </main>
  );
}
