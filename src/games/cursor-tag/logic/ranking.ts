import type { TagMember } from "./cursorTagState";

/**
 * A score as players see it: whole seconds, rounded down like a stopwatch (rules.md, §7), so that
 * « 42 s » runs from 42 000 to 42 999 ms. Rounded to the millisecond first: a sum of tick lengths
 * can land a hair under a whole second it has really reached.
 */
export function displayedSeconds(scoreMs: number): number {
  return Math.floor(Math.round(scoreMs) / 1000);
}

/**
 * The final ranking (rules.md, §7): the players still in the game, with the score they see, best
 * first. What players see decides: two players at « 42 s » share a place, whatever their
 * milliseconds, and the room gives them the same points (architecture §5.6).
 */
export function finalRanking(
  players: readonly TagMember[],
): Array<{ playerId: string; score: number }> {
  return players
    .map((player) => ({ playerId: player.playerId, score: displayedSeconds(player.scoreMs) }))
    .sort((a, b) => b.score - a.score);
}
