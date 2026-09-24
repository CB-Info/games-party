import type { RoundPlayer } from "./cursorTagState";
import type { Segment } from "./pathGeometry";

/**
 * A player's path this tick (rules.md, §6.3): a straight line from where the tick started them,
 * which is where the previous tick left them, their spawn point or the portal they came out of, to
 * where they are now.
 */
export function currentPath(player: RoundPlayer): Segment {
  return { from: player.tickStart, to: player.position };
}

/** Ends the tick's paths: where each player stands starts their next one (rules.md, §6.6, step 6). */
export function closePaths(players: readonly RoundPlayer[]): RoundPlayer[] {
  return players.map((player) => ({ ...player, tickStart: player.position }));
}
