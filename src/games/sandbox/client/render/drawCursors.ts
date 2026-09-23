import type { ArenaTheme } from "../../../../client/engine/arenaTheme";
import type { Point } from "../../../../shared/cursor/collision";
import type { PlayerColorId } from "../../../../shared/types";
import { SANDBOX_CURSOR_RADIUS } from "../../shared/constants";

/** Thickness of the ring around your own cursor, in screen pixels (§12). */
const OWN_RING_WIDTH = 3;

/** Distance between a cursor and its label, and the label's padding, in screen pixels (§12). */
const LABEL_GAP = 8;
const LABEL_PADDING_X = 8;
const LABEL_PADDING_Y = 4;

export interface DrawableCursor {
  position: Point;
  pseudo: string;
  color: PlayerColorId;
  /** Your own cursor wears a ring, so that you can find it among ten (§12). */
  isMine: boolean;
}

/**
 * Draws the cursors and their labels (docs/design-system.md, §12). The disc follows the arena's
 * size; the ring, the label and its text stay the same on screen whatever the arena measures —
 * a twelve-pixel pseudo that shrank with the window would stop being readable.
 */
export function drawCursors(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  cursors: readonly DrawableCursor[],
): void {
  const radius = SANDBOX_CURSOR_RADIUS * scale;

  for (const cursor of cursors) {
    const x = cursor.position.x * scale;
    const y = cursor.position.y * scale;

    context.fillStyle = theme.colors.player[cursor.color];
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    if (cursor.isMine) {
      context.strokeStyle = theme.colors.ink;
      context.lineWidth = OWN_RING_WIDTH;
      context.beginPath();
      context.arc(x, y, radius + OWN_RING_WIDTH / 2, 0, Math.PI * 2);
      context.stroke();
    }

    drawLabel(context, theme, cursor.pseudo, x + radius + LABEL_GAP, y);
  }
}

function drawLabel(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  pseudo: string,
  x: number,
  y: number,
): void {
  const { labelFontSize, labelFontWeight, labelRadius, fontFamily } = theme.metrics;

  context.font = `${labelFontWeight} ${labelFontSize}px ${fontFamily}`;
  context.textAlign = "left";
  context.textBaseline = "middle";

  const width = context.measureText(pseudo).width + LABEL_PADDING_X * 2;
  const height = labelFontSize + LABEL_PADDING_Y * 2;

  context.fillStyle = theme.colors.label;
  context.beginPath();
  context.roundRect(x, y - height / 2, width, height, labelRadius);
  context.fill();

  context.fillStyle = theme.colors.ink;
  context.fillText(pseudo, x + LABEL_PADDING_X, y);
}
