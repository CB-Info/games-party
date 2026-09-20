import { comparePseudos } from "../../shared/pseudo";
import type { CumulativeStanding, GameRankingLine } from "../../shared/types";

/** A scored player, as the game hands them over and as the room knows them. */
export interface ScoredPlayer {
  playerId: string;
  pseudo: string;
  score: number;
}

/**
 * Place of each player: one plus the number of players scoring strictly more. Equal players share
 * a place and the following ones are skipped (docs/architecture.md, §5.6).
 */
function placeOf(score: number, scores: readonly number[]): number {
  return 1 + scores.filter((other) => other > score).length;
}

/**
 * Ranking of a finished game. Points are `N − place`, so the first scores N − 1 and the last 0.
 * Ties are ordered by pseudo, ignoring case and accents (docs/architecture.md, §5.6).
 */
export function rankGame(players: readonly ScoredPlayer[]): GameRankingLine[] {
  const scores = players.map((player) => player.score);

  return players
    .map((player) => {
      const place = placeOf(player.score, scores);
      return {
        playerId: player.playerId,
        pseudo: player.pseudo,
        place,
        score: player.score,
        pointsAwarded: players.length - place,
      };
    })
    .sort((a, b) => (a.place !== b.place ? a.place - b.place : comparePseudos(a, b)))
    .map(({ playerId, place, score, pointsAwarded }) => ({
      playerId,
      place,
      score,
      pointsAwarded,
    }));
}

/** A player of the room's running leaderboard, before and after the game that just ended. */
export interface StandingInput {
  playerId: string;
  pseudo: string;
  pointsBefore: number;
  pointsAwarded: number;
}

/**
 * The room's leaderboard after a game, with the place each player held just before it so that the
 * client can show the progression arrow (docs/architecture.md, §5.6).
 */
export function rankCumulative(players: readonly StandingInput[]): CumulativeStanding[] {
  const before = players.map((player) => player.pointsBefore);
  const after = players.map((player) => player.pointsBefore + player.pointsAwarded);

  return players
    .map((player) => {
      const points = player.pointsBefore + player.pointsAwarded;
      return {
        playerId: player.playerId,
        pseudo: player.pseudo,
        points,
        place: placeOf(points, after),
        previousPlace: placeOf(player.pointsBefore, before),
      };
    })
    .sort((a, b) => (a.place !== b.place ? a.place - b.place : comparePseudos(a, b)))
    .map(({ playerId, points, place, previousPlace }) => ({
      playerId,
      points,
      place,
      previousPlace,
    }));
}
