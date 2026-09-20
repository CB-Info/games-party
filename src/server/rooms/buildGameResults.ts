import type { GameResults } from "../../shared/types";
import type { RoomMember } from "./roomMember";
import { rankCumulative, rankGame } from "./ranking";

/**
 * Turns the ranking a game hands back into the room's results: places and points of the game, then
 * the running leaderboard with the place each player held before it (docs/architecture.md, §5.6).
 * Players already removed from the room are dropped from the ranking.
 */
export function buildGameResults(
  ranking: ReadonlyArray<{ playerId: string; score: number }>,
  members: readonly RoomMember[],
): { results: GameResults; awarded: Map<string, number> } {
  const byId = new Map(members.map((member) => [member.playerId, member]));

  const scored = ranking.flatMap((line) => {
    const member = byId.get(line.playerId);
    return member === undefined ? [] : [{ ...line, pseudo: member.pseudo }];
  });

  const gameRanking = rankGame(scored);
  const awarded = new Map(gameRanking.map((line) => [line.playerId, line.pointsAwarded]));

  const cumulative = rankCumulative(
    members.map((member) => ({
      playerId: member.playerId,
      pseudo: member.pseudo,
      pointsBefore: member.points,
      pointsAwarded: awarded.get(member.playerId) ?? 0,
    })),
  );

  return { results: { ranking: gameRanking, cumulative }, awarded };
}
