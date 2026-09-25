import { useEffect, useMemo, type RefObject } from "react";

import { readArenaTheme } from "../../../../client/engine/arenaTheme";
import { displayTime, frameStep } from "../../../../client/engine/interpolation";
import { createOwnCursor } from "../../../../client/engine/ownCursor";
import { portalLoopAt } from "../../../../client/engine/portalLoop";
import { createRenderLoop } from "../../../../client/engine/renderLoop";
import { useCursorInputs } from "../../../../client/features/game/hooks/useCursorInputs";
import { usePredictionProbe } from "../../../../client/features/game/hooks/usePredictionProbe";
import type { GameScreenProps } from "../../../gameClient.types";
import type { ViewSample } from "../../../gameView.types";
import { defaultOptions, settingsFor } from "../../logic/cursorTagOptions";
import { myCursorIn } from "../../logic/myCursor";
import { CURSOR_RADIUS } from "../../shared/constants";
import { WALLS } from "../../shared/map";
import { cursorTagOptionsSchema } from "../../shared/schemas";
import type { TagCursor } from "../render/drawTagCursors";
import { mineAt, othersAt } from "../render/tagDrawables";
import { drawTagFrame, timedBracket, viewOf } from "../render/tagFrame";
import type { TagRoundState } from "./useTagRoundState";

interface RendererDeps extends Pick<
  GameScreenProps,
  "viewStore" | "options" | "sendInput" | "me" | "players"
> {
  canvas: RefObject<HTMLCanvasElement | null>;
  scaleRef: RefObject<number>;
  locked: boolean;
  report: TagRoundState["report"];
}

/**
 * The moving part of Cursor Tag's screen, outside React (règle d'or 4): it reads the views,
 * predicts the local cursor at the speed of its role, draws the others at the delayed moment, and
 * reports the phase and the role to the screen when they change.
 */
export function useCursorTagRenderer(deps: RendererDeps) {
  const { canvas, scaleRef, locked, viewStore, options, sendInput, me, players, report } = deps;

  // `settingsFor` stays the one reader of the catch-up leash (rules.md, §15.3).
  const parsed = cursorTagOptionsSchema.safeParse(options);
  const { catchUpMs } = settingsFor(parsed.success ? parsed.data : defaultOptions());
  const myPlayerId = "playerId" in me ? me.playerId : null;

  const probe = usePredictionProbe();
  const sender = useCursorInputs({ sendInput, canvas, scaleRef, locked, probe });
  const cursor = useMemo(
    () =>
      createOwnCursor({
        inputs: {
          ...sender,
          pendingDelta: () => toPoint(sender.pendingDelta()),
        },
        radius: CURSOR_RADIUS,
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
    const names = {
      colorOf: new Map(players.map((player) => [player.playerId, player.color])),
      pseudoOf: new Map(players.map((player) => [player.playerId, player.pseudo])),
    };
    let previousFrameAt = performance.now();
    let landed: ViewSample | null = null;

    const loop = createRenderLoop((now) => {
      const context = element.getContext("2d");
      const scale = scaleRef.current;
      const sample = viewStore.latest();
      const latest = sample === null ? null : viewOf(sample);
      const dtMs = frameStep(previousFrameAt, now);
      previousFrameAt = now;
      if (context === null || scale <= 0) {
        return;
      }
      if (sample === null || latest === null) {
        drawTagFrame(context, theme, scale, { latest: null, cursors: [] }, null);
        return;
      }

      const mine = myPlayerId === null ? null : myCursorIn(latest, myPlayerId);
      report(latest.phase, mine?.cursor?.role ?? null);

      const at = displayTime(sample, Date.now());
      const cursors: TagCursor[] = othersAt(
        timedBracket(viewStore.sampleAt(at)),
        at,
        myPlayerId,
        names,
      );

      if (myPlayerId !== null && mine !== null) {
        if (sample !== landed) {
          landed = sample;
          cursor.land(
            {
              receivedAt: sample.receivedAt,
              lastProcessedSeq: mine.lastProcessedSeq,
              snapshot: mine.cursor,
            },
            Date.now(),
          );
        }

        const drawn = cursor.draw(Date.now(), dtMs, now)?.drawn ?? null;
        const own = drawn === null ? null : mineAt(latest, myPlayerId, drawn, names);
        if (own !== null) {
          cursors.push(own);
        }
      }

      drawTagFrame(context, theme, scale, { latest, cursors }, portalLoopAt(theme.loop, now));
    });

    loop.start();
    return () => loop.stop();
  }, [canvas, scaleRef, viewStore, cursor, myPlayerId, players, report]);

  return { probe, catchUpMs };
}

function toPoint(delta: { dx: number; dy: number }): { x: number; y: number } {
  return { x: delta.dx, y: delta.dy };
}
