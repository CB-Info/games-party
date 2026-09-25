import type { Point } from "../../shared/cursor/collision";
import type { ArenaTheme } from "./arenaTheme";

/** Thickness of a portal's ring, in screen pixels (docs/design-system.md, §12). */
const PORTAL_STROKE = 2;

/** Pair B's dashes and the gaps between them, in screen pixels (§12). */
const PORTAL_DASH = [8, 6];

export interface DrawablePortal {
  /** Where the portal is, and its radius, in arena units. */
  center: Point;
  radius: number;
  /** The pair's letter, A or B, written at the centre. */
  letter: string;
  /** Pair B is dashed and pair A solid, so that the two are told apart without colour (§12). */
  dashed: boolean;
}

/**
 * One mouth of a pair of portals: its ring and its letter (docs/design-system.md, §12). The ring
 * follows the arena's size; its stroke and the letter are screen sizes, like the pseudo labels.
 */
export function drawPortal(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  portal: DrawablePortal,
): void {
  const { labelFontSize, labelFontWeight, fontFamily } = theme.metrics;
  const x = portal.center.x * scale;
  const y = portal.center.y * scale;

  context.strokeStyle = theme.colors.portal;
  context.lineWidth = PORTAL_STROKE;
  context.setLineDash(portal.dashed ? PORTAL_DASH : []);
  context.beginPath();
  context.arc(x, y, portal.radius * scale, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = theme.colors.portal;
  context.font = `${labelFontWeight} ${labelFontSize}px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(portal.letter, x, y);
}
