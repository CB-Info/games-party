import { useEffect, useMemo, type RefObject } from "react";

import { readArenaTheme } from "../../../../client/engine/arenaTheme";
import { displayTime, frameStep } from "../../../../client/engine/interpolation";
import { createOwnCursor, type OwnSample } from "../../../../client/engine/ownCursor";
import { createRenderLoop } from "../../../../client/engine/renderLoop";
import { useCursorInputs } from "../../../../client/features/game/hooks/useCursorInputs";
import { usePredictionProbe } from "../../../../client/features/game/hooks/usePredictionProbe";
import { WALLS } from "../../../cursor-tag/shared/map";
import type { GameScreenProps } from "../../../gameClient.types";
import type { ViewSample } from "../../../gameView.types";
import { isSandboxView, mySnapshot } from "../../logic/sandboxView";
import {
  SANDBOX_CATCH_UP_MS_DEFAULT,
  SANDBOX_CURSOR_RADIUS,
  SANDBOX_SPEED_DEFAULT,
} from "../../shared/constants";
import { sandboxOptionsSchema } from "../../shared/schemas";
import { drawArena } from "../render/drawArena";
import { drawCursors } from "../render/drawCursors";
import { otherDrawableCursors } from "../render/otherCursors";

interface RendererDeps extends Pick<
  GameScreenProps,
  "viewStore" | "options" | "sendInput" | "me" | "players"
> {
  canvas: RefObject<HTMLCanvasElement | null>;
  scaleRef: RefObject<number>;
  /** No input is sent while the mouse is free, so the cursor stands still server-side (§6.5). */
  locked: boolean;
}

export interface RendererHandle {
  /** The development readout, or a box that stays empty in production. */
  probe: ReturnType<typeof usePredictionProbe>;
  /** The speed the host chose, which the readout needs to say what the ceiling is worth. */
  maxSpeed: number;
  /** The « Rattrapage » the host chose, which the readout copies with its figures. */
  catchUpMs: number;
}

/**
 * The whole moving part of the sandbox, in one place and outside React: it reads the view buffer,
 * predicts the local cursor, interpolates the others and draws, sixty times a second
 * (règle d'or 4).
 */
export function useSandboxRenderer(deps: RendererDeps): RendererHandle {
  const { canvas, scaleRef, locked, viewStore, options, sendInput, me, players } = deps;

  // The prediction must move the cursor as the server does, and the host sets how in the lobby.
  const parsed = sandboxOptionsSchema.safeParse(options);
  const maxSpeed = parsed.success ? parsed.data.maxSpeed : SANDBOX_SPEED_DEFAULT;
  const catchUpMs = parsed.success ? parsed.data.catchUpMs : SANDBOX_CATCH_UP_MS_DEFAULT;

  const myPlayerId = "playerId" in me ? me.playerId : null;
  const probe = usePredictionProbe();
  const sender = useCursorInputs({ sendInput, canvas, scaleRef, locked, probe });
  // Kept across restarts of the render loop, which a change of the player list causes: what it
  // is still easing would otherwise be dropped halfway.
  const cursor = useMemo(
    () =>
      createOwnCursor({
        inputs: { ...sender, pendingDelta: () => toPoint(sender.pendingDelta()) },
        radius: SANDBOX_CURSOR_RADIUS,
        walls: WALLS,
        catchUpMs,
        probe: () => probe.current,
      }),
    [sender, catchUpMs, probe],
  );

  useEffect(() => {
    const element = canvas.current;
    if (element === null) {
      return;
    }

    const theme = readArenaTheme();
    const colorOf = new Map(players.map((player) => [player.playerId, player.color]));
    const pseudoOf = new Map(players.map((player) => [player.playerId, player.pseudo]));
    let previousFrameAt = performance.now();
    let landed: ViewSample | null = null;

    const loop = createRenderLoop((now) => {
      const context = element.getContext("2d");
      const scale = scaleRef.current;
      if (context === null || scale <= 0) {
        return;
      }

      const dtMs = frameStep(previousFrameAt, now);
      previousFrameAt = now;

      drawArena(context, theme, scale);

      const latest = viewStore.latest();
      if (latest === null || !isSandboxView(latest.view)) {
        return;
      }

      const drawable = otherDrawableCursors({
        viewStore,
        myPlayerId,
        at: displayTime(latest, Date.now()),
        colorOf,
        pseudoOf,
      });

      if (myPlayerId !== null) {
        if (latest !== landed) {
          landed = latest;
          cursor.land(ownSampleOf(latest, myPlayerId, maxSpeed), Date.now());
        }

        const frame = cursor.draw(Date.now(), dtMs, now);
        if (frame !== null) {
          drawable.push({
            position: frame.drawn,
            pseudo: pseudoOf.get(myPlayerId) ?? "",
            color: colorOf.get(myPlayerId) ?? "c1",
            isMine: true,
          });
        }
      }

      drawCursors(context, theme, scale, drawable);
    });

    loop.start();
    return () => loop.stop();
  }, [canvas, scaleRef, viewStore, cursor, myPlayerId, players, maxSpeed]);

  return { probe, maxSpeed, catchUpMs };
}

/** What a sandbox view says of this browser's own cursor. Nothing ever freezes it here. */
function ownSampleOf(sample: ViewSample, myPlayerId: string, maxSpeed: number): OwnSample {
  const mine = isSandboxView(sample.view) ? mySnapshot(sample.view, myPlayerId) : null;

  return {
    receivedAt: sample.receivedAt,
    lastProcessedSeq: mine?.lastProcessedSeq ?? null,
    snapshot:
      mine === null
        ? null
        : {
            position: mine.position,
            budget: mine.budget,
            backlog: mine.backlog,
            maxSpeed,
            frozen: false,
          },
  };
}

function toPoint(delta: { dx: number; dy: number }): { x: number; y: number } {
  return { x: delta.dx, y: delta.dy };
}
