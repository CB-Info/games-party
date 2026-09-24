import { moveWithBacklog } from "../../../shared/cursor/backlog";
import type { Point } from "../../../shared/cursor/collision";
import { rechargeBudget } from "../../../shared/cursor/moveCursor";
import { CHAT_SPEED_MULTIPLIER, CURSOR_RADIUS, RUNNER_MAX_SPEED } from "../shared/constants";
import { WALLS } from "../shared/map";
import type { Role } from "../shared/types";
import type { RoundPlayer } from "./cursorTagState";

/**
 * The top speed of a role (rules.md, §6.2): the one rule that links them, for the server, the bots
 * and the client's prediction alike. A player takes the speed of their new role the moment it
 * changes.
 */
export function maxSpeedOf(role: Role): number {
  return role === "chat" ? RUNNER_MAX_SPEED * CHAT_SPEED_MULTIPLIER : RUNNER_MAX_SPEED;
}

/**
 * One move at the player's role speed, through Cursor Tag's walls, remainder included (rules.md,
 * §6.2). The leash follows the role too: a remainder kept at a Chat's speed is cut back to a
 * Runner's leash by the first move after the role changed. Portals are the caller's to check.
 */
export function moveAtRoleSpeed(player: RoundPlayer, delta: Point, catchUpMs: number): RoundPlayer {
  const moved = moveWithBacklog({
    position: player.position,
    delta,
    backlog: player.backlog,
    budget: player.budget,
    maxSpeed: maxSpeedOf(player.role),
    radius: CURSOR_RADIUS,
    walls: WALLS,
    catchUpMs,
  });

  return { ...player, position: moved.position, budget: moved.budget, backlog: moved.backlog };
}

/** Refills a budget for the inputs of the next tick, up to the role's reserve (architecture §6.5). */
export function rechargeAtRoleSpeed(player: RoundPlayer, dtMs: number): RoundPlayer {
  return { ...player, budget: rechargeBudget(player.budget, maxSpeedOf(player.role), dtMs) };
}
