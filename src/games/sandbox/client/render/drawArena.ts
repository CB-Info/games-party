import type { ArenaTheme } from "../../../../client/engine/arenaTheme";
import { ARENA_HEIGHT, ARENA_WALL_RADIUS, ARENA_WIDTH } from "../../../../shared/constants";
import { PORTAL_PAIRS, WALLS } from "../../../cursor-tag/shared/map";

/** Thickness of a portal ring, in screen pixels (docs/design-system.md, §12). */
const PORTAL_STROKE = 2;

/** Radius of a portal ring, in arena units (rules.md of cursor-tag, §14). */
const PORTAL_RADIUS = 36;

/**
 * Draws everything that never moves: the ground, the walls and the portals
 * (docs/design-system.md, §12). Coordinates are in **CSS pixels**: arena units are multiplied by
 * `scale`, and the few screen sizes are written as they are. The two spaces are deliberately
 * distinct — §12 marks, one by one, the sizes that do not follow the arena.
 */
export function drawArena(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
): void {
  const width = ARENA_WIDTH * scale;
  const height = ARENA_HEIGHT * scale;

  // The arena is a rounded rectangle, and nothing may be drawn outside it: a cursor pressed into
  // a corner is clipped rather than spilling over the border (§12).
  context.save();
  context.beginPath();
  context.roundRect(0, 0, width, height, theme.metrics.arenaRadius);
  context.clip();

  context.fillStyle = theme.colors.arena;
  context.fillRect(0, 0, width, height);

  context.fillStyle = theme.colors.wall;
  for (const wall of WALLS) {
    context.beginPath();
    context.roundRect(
      wall.x * scale,
      wall.y * scale,
      wall.width * scale,
      wall.height * scale,
      ARENA_WALL_RADIUS * scale,
    );
    context.fill();
  }

  drawPortals(context, theme, scale);
  context.restore();
}

/**
 * The two pairs of portals. The sandbox draws them and they do nothing: they are here to give the
 * engine something recognisable to move around (sandbox rules.md, §6). They do not pulse — a
 * pulsing portal in Cursor Tag says "usable", and an inert one saying it would lie.
 */
function drawPortals(context: CanvasRenderingContext2D, theme: ArenaTheme, scale: number): void {
  const { labelFontSize, labelFontWeight, fontFamily } = theme.metrics;

  context.strokeStyle = theme.colors.portal;
  context.fillStyle = theme.colors.portal;
  context.lineWidth = PORTAL_STROKE;
  context.font = `${labelFontWeight} ${labelFontSize}px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const { pair, first, second } of PORTAL_PAIRS) {
    // Pair B is dashed, pair A solid, so that the two are told apart without colour (§12).
    context.setLineDash(pair === "B" ? [8, 6] : []);

    for (const point of [first, second]) {
      context.beginPath();
      context.arc(point.x * scale, point.y * scale, PORTAL_RADIUS * scale, 0, Math.PI * 2);
      context.stroke();
      context.fillText(pair, point.x * scale, point.y * scale);
    }
  }

  context.setLineDash([]);
}
