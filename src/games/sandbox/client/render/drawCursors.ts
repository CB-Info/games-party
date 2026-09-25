import type { ArenaTheme } from "../../../../client/engine/arenaTheme";
import {
  drawDisc,
  drawLabel,
  drawOwnRing,
  placeCursor,
} from "../../../../client/engine/drawCursor";
import type { Point } from "../../../../shared/cursor/collision";
import type { PlayerColorId } from "../../../../shared/types";
import { SANDBOX_CURSOR_RADIUS } from "../../shared/constants";

export interface DrawableCursor {
  position: Point;
  pseudo: string;
  color: PlayerColorId;
  /** Your own cursor wears a ring, so that you can find it among ten (§12). */
  isMine: boolean;
}

/**
 * Draws the cursors and their labels (docs/design-system.md, §12). The disc follows the arena's
 * size; the ring, the label and its text stay the same on screen whatever the arena measures.
 */
export function drawCursors(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  cursors: readonly DrawableCursor[],
): void {
  for (const cursor of cursors) {
    const place = placeCursor(cursor.position, SANDBOX_CURSOR_RADIUS, scale);

    drawDisc(context, theme, place, cursor.color);
    if (cursor.isMine) {
      drawOwnRing(context, theme, place);
    }
    drawLabel(context, theme, place, cursor.pseudo);
  }
}
