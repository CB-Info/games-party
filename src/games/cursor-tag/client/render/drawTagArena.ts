import type { ArenaTheme } from "../../../../client/engine/arenaTheme";
import { drawGround } from "../../../../client/engine/drawArenaGround";
import { drawPortal } from "../../../../client/engine/drawPortal";
import { PORTAL_RADIUS } from "../../shared/constants";
import { PORTAL_PAIRS, WALLS, type PortalPairId } from "../../shared/map";

export interface PortalState {
  /**
   * How far the portal loop has gone, or `null` when no portal may pulse: during a preparation,
   * where nobody moves, they have no effect for anyone, and with reduced motion nothing pulses.
   */
  pulse: number | null;
  /** The pairs on cooldown for the local player, dimmed and still (§12). Empty for a spectator. */
  cooldown: ReadonlySet<PortalPairId>;
}

/** The ground, the walls and the two pairs of portals of Cursor Tag (docs/design-system.md, §12). */
export function drawTagArena(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  portals: PortalState,
): void {
  drawGround(context, theme, scale, WALLS);

  for (const { pair, first, second } of PORTAL_PAIRS) {
    for (const center of [first, second]) {
      drawPortal(context, theme, scale, {
        center,
        radius: PORTAL_RADIUS,
        letter: pair,
        dashed: pair === "B",
        pulse: portals.pulse,
        cooldown: portals.cooldown.has(pair),
      });
    }
  }
}
