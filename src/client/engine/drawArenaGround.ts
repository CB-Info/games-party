import { ARENA_HEIGHT, ARENA_WALL_RADIUS, ARENA_WIDTH } from "../../shared/constants";
import type { Wall } from "../../shared/cursor/collision";
import type { ArenaTheme } from "./arenaTheme";

/**
 * Runs `draw` clipped to the arena. The arena is a rounded rectangle, and nothing may be drawn
 * outside it: a cursor pressed into a corner is clipped rather than spilling over the border
 * (docs/design-system.md, §12).
 */
export function withinArena(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  draw: () => void,
): void {
  context.save();
  context.beginPath();
  context.roundRect(0, 0, ARENA_WIDTH * scale, ARENA_HEIGHT * scale, theme.metrics.arenaRadius);
  context.clip();
  draw();
  context.restore();
}

/**
 * Draws what never moves under the players: the ground and the walls (docs/design-system.md,
 * §12). Coordinates are in **CSS pixels**: arena units are multiplied by `scale`, and the few sizes
 * §12 marks as screen sizes are written as they are. The two spaces are deliberately distinct.
 */
export function drawGround(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  walls: readonly Wall[],
): void {
  context.fillStyle = theme.colors.arena;
  context.fillRect(0, 0, ARENA_WIDTH * scale, ARENA_HEIGHT * scale);

  context.fillStyle = theme.colors.wall;
  for (const wall of walls) {
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
}
