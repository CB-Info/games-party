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

/**
 * Ends the tick's paths (rules.md, §6.6, step 6): where each player stands starts their next one,
 * and the path just run joins the ones the rewind may reach, unless an event broke it. Only the
 * last `rewindTicks` are kept, none at all without a rewind.
 */
export function closePaths(players: readonly RoundPlayer[], rewindTicks: number): RoundPlayer[] {
  return players.map((player) => {
    const kept = player.pathBroken ? [] : [...player.pastPaths, currentPath(player)];

    return {
      ...player,
      tickStart: player.position,
      // Counted from the start: `slice(-0)` would keep every path.
      pastPaths: kept.slice(Math.max(0, kept.length - rewindTicks)),
      pathBroken: false,
    };
  });
}

/**
 * An event the rewind never reaches back past (rules.md, §6.3): a role change, a freeze end or a
 * reconnection. The paths before it are dropped, and so is the one under way, which began before
 * it: an event between two ticks falls inside the next tick's path.
 */
export function breakPaths(player: RoundPlayer): RoundPlayer {
  return { ...player, pastPaths: [], pathBroken: true };
}

/**
 * The Runner's path a Chat's path is tested against (rules.md, §6.3): the Runner's own from
 * `TAG_REWIND_TICKS` ticks back, but never from before the last event of either player. Without a
 * rewind, or with no path left to reach back to, it is the Runner's path this tick.
 */
export function runnerPathAgainst(chat: RoundPlayer, runner: RoundPlayer): Segment {
  const ticksBack = Math.min(chat.pastPaths.length, runner.pastPaths.length);

  // Both lists hold at least `ticksBack` paths, so the index always falls on one.
  return ticksBack === 0
    ? currentPath(runner)
    : (runner.pastPaths[runner.pastPaths.length - ticksBack] as Segment);
}
