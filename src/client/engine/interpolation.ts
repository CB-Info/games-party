import {
  INTERPOLATION_DELAY_MS,
  MAX_TICK_DT_MS,
  TELEPORT_SNAP_DISTANCE,
} from "../../shared/constants";
import { distance, type Point } from "../../shared/cursor/collision";
import type { ViewSample } from "../../games/gameView.types";

/**
 * The moment, on the server's clock, that the other cursors are drawn at
 * (docs/architecture.md, §6.5). Drawing slightly in the past is what lets two views be
 * interpolated instead of jumped between: without the delay there would be nothing to aim for.
 */
export function displayTime(latest: ViewSample, now: number): number {
  return latest.serverTime + (now - latest.receivedAt) - INTERPOLATION_DELAY_MS;
}

/**
 * A point between two others. Beyond `TELEPORT_SNAP_DISTANCE` the second one is taken as it is:
 * a jump that big is a teleport decided by the game, and sliding through the walls to reach it
 * would look worse than arriving (§6.5).
 */
export function interpolatePoint(from: Point, to: Point, t: number): Point {
  if (distance(from, to) > TELEPORT_SNAP_DISTANCE) {
    return to;
  }

  const factor = Math.min(1, Math.max(0, t));
  return {
    x: from.x + (to.x - from.x) * factor,
    y: from.y + (to.y - from.y) * factor,
  };
}

/**
 * The step handed to the engine between two frames. Capped like the server's own step, so that a
 * tab left in the background does not come back with one enormous frame (§6.3).
 */
export function frameStep(previousFrameAt: number, now: number): number {
  return Math.min(MAX_TICK_DT_MS, Math.max(0, now - previousFrameAt));
}
