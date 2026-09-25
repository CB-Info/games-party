import type { ArenaTheme } from "../../../../client/engine/arenaTheme";
import { drawGround, withinArena } from "../../../../client/engine/drawArenaGround";
import { drawPortal } from "../../../../client/engine/drawPortal";
import { PORTAL_RADIUS } from "../../../cursor-tag/shared/constants";
import { PORTAL_PAIRS, WALLS } from "../../../cursor-tag/shared/map";

/**
 * Draws everything that never moves: the ground, the walls and the portals of Cursor Tag's arena
 * (docs/design-system.md, §12). The sandbox's portals do nothing: they are here to give the engine
 * something recognisable to move around (sandbox rules.md, §6). They do not pulse — a pulsing
 * portal says "usable", and an inert one saying it would lie.
 */
export function drawArena(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
): void {
  withinArena(context, theme, scale, () => {
    drawGround(context, theme, scale, WALLS);

    for (const { pair, first, second } of PORTAL_PAIRS) {
      for (const center of [first, second]) {
        drawPortal(context, theme, scale, {
          center,
          radius: PORTAL_RADIUS,
          letter: pair,
          dashed: pair === "B",
        });
      }
    }
  });
}
