import type { Point } from "../../shared/cursor/collision";
import type { PlayerColorId } from "../../shared/types";
import type { ArenaTheme } from "./arenaTheme";

/** Thickness of the ring around your own cursor, in screen pixels (docs/design-system.md, §12). */
const OWN_RING_WIDTH = 3;

/** Distance between a cursor and its label, in screen pixels. */
const LABEL_GAP = 8;

/** The label's inner margin, in screen pixels (§12: 4 × 8). */
const LABEL_PADDING_X = 8;
const LABEL_PADDING_Y = 4;

/** Where a cursor sits on the canvas, in CSS pixels, with its disc's radius. */
export interface CursorPlace {
  x: number;
  y: number;
  radius: number;
}

/** A cursor's centre on the canvas, from its position in arena units. */
export function placeCursor(position: Point, radius: number, scale: number): CursorPlace {
  return { x: position.x * scale, y: position.y * scale, radius: radius * scale };
}

/** The disc of a cursor, in its player's colour (§12). */
export function drawDisc(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  place: CursorPlace,
  color: PlayerColorId,
): void {
  context.fillStyle = theme.colors.player[color];
  context.beginPath();
  context.arc(place.x, place.y, place.radius, 0, Math.PI * 2);
  context.fill();
}

/** The ring your own cursor wears, so that you find it among ten (§12). */
export function drawOwnRing(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  place: CursorPlace,
): void {
  context.strokeStyle = theme.colors.ink;
  context.lineWidth = OWN_RING_WIDTH;
  context.beginPath();
  context.arc(place.x, place.y, place.radius + OWN_RING_WIDTH / 2, 0, Math.PI * 2);
  context.stroke();
}

/**
 * The pseudo beside a cursor, and what a game adds after it in the secondary ink, such as Cursor
 * Tag's « · chat » (§12). The whole label is in screen pixels, whatever the arena measures: a
 * twelve-pixel pseudo that shrank with the window would stop being readable.
 */
export function drawLabel(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  place: CursorPlace,
  pseudo: string,
  suffix = "",
): void {
  const { labelFontSize, labelFontWeight, labelRadius, fontFamily } = theme.metrics;
  const x = place.x + place.radius + LABEL_GAP;

  context.font = `${labelFontWeight} ${labelFontSize}px ${fontFamily}`;
  context.textAlign = "left";
  context.textBaseline = "middle";

  const pseudoWidth = context.measureText(pseudo).width;
  const width = pseudoWidth + context.measureText(suffix).width + LABEL_PADDING_X * 2;
  const height = labelFontSize + LABEL_PADDING_Y * 2;

  context.fillStyle = theme.colors.label;
  context.beginPath();
  context.roundRect(x, place.y - height / 2, width, height, labelRadius);
  context.fill();

  context.fillStyle = theme.colors.ink;
  context.fillText(pseudo, x + LABEL_PADDING_X, place.y);

  if (suffix !== "") {
    context.fillStyle = theme.colors.inkSecondary;
    context.fillText(suffix, x + LABEL_PADDING_X + pseudoWidth, place.y);
  }
}
