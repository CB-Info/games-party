import { useEffect, type RefObject } from "react";

import { readArenaTheme } from "../../../../client/engine/arenaTheme";
import { withinArena } from "../../../../client/engine/drawArenaGround";
import { portalLoopAt } from "../../../../client/engine/portalLoop";
import { createRenderLoop } from "../../../../client/engine/renderLoop";
import { useArenaSurface } from "../../../../client/features/game/hooks/useArenaSurface";
import type { PortalPairId } from "../../shared/map";
import { drawTagArena } from "../render/drawTagArena";
import { drawTagCursors, type TagCursor } from "../render/drawTagCursors";

/** A fixed picture of the arena, drawn by the game's own renderer (docs/design-system.md, §13). */
export interface ArenaScene {
  cursors: readonly TagCursor[];
  /** False for a preparation, where the portals have no effect and do not pulse (§12). */
  portalsPulse: boolean;
  /** Pairs on cooldown for the player the scene is seen by: dimmed and still. */
  cooldown: readonly PortalPairId[];
  /** A still image: nothing pulses, and it is drawn only when its size changes. */
  still?: boolean;
  /** Shows the scene as a player who asked for fewer animations sees it. */
  reducedMotion?: boolean;
}

/**
 * Draws a fixed scene on a canvas sized to its container: the lobby's preview of the arena, and
 * the scenes of `/dev/ui`. The same drawing as the game itself, so that what the lobby shows is what
 * the game will look like. A moving scene runs a render loop for its pulses; a still one is
 * redrawn when its box changes, and costs nothing in between. `scene` must keep its identity, or
 * the drawing restarts at every render.
 */
export function useArenaScene(
  container: RefObject<HTMLElement | null>,
  canvas: RefObject<HTMLCanvasElement | null>,
  scene: ArenaScene,
): void {
  const { box, scaleRef } = useArenaSurface(container, canvas);

  useEffect(() => {
    const element = canvas.current;
    if (element === null || box.width === 0) {
      return;
    }

    const read = readArenaTheme();
    const theme =
      scene.reducedMotion === true
        ? { ...read, loop: { ...read.loop, reducedMotion: true } }
        : read;
    const cooldown = new Set(scene.cooldown);

    const draw = (now: number): void => {
      const context = element.getContext("2d");
      const scale = scaleRef.current;
      if (context === null || scale <= 0) {
        return;
      }

      const pulse = scene.still === true ? null : portalLoopAt(theme.loop, now);
      withinArena(context, theme, scale, () => {
        drawTagArena(context, theme, scale, { pulse: scene.portalsPulse ? pulse : null, cooldown });
        drawTagCursors(context, theme, scale, scene.cursors, pulse);
      });
    };

    if (scene.still === true) {
      draw(0);
      return;
    }

    const loop = createRenderLoop(draw);
    loop.start();
    return () => loop.stop();
  }, [canvas, scaleRef, box, scene]);
}
