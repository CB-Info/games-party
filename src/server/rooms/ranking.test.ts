import { describe, expect, it } from "vitest";

import { rankCumulative, rankGame, type ScoredPlayer } from "./ranking";

function scored(pseudo: string, score: number): ScoredPlayer {
  return { playerId: `id-${pseudo}`, pseudo, score };
}

describe("rankGame", () => {
  it("gives N − 1 points to the first and none to the last", () => {
    const ranking = rankGame([scored("Mika", 40), scored("Nova", 30), scored("Zippy", 20)]);

    expect(ranking.map((line) => [line.place, line.pointsAwarded])).toEqual([
      [1, 2],
      [2, 1],
      [3, 0],
    ]);
  });

  it("gives four players without a tie 3 / 2 / 1 / 0", () => {
    const ranking = rankGame([
      scored("Mika", 40),
      scored("Nova", 30),
      scored("Zippy", 20),
      scored("Biscuit", 10),
    ]);

    expect(ranking.map((line) => line.pointsAwarded)).toEqual([3, 2, 1, 0]);
  });

  it("skips the place after a tie at the top", () => {
    const ranking = rankGame([
      scored("Mika", 40),
      scored("Nova", 40),
      scored("Zippy", 20),
      scored("Biscuit", 10),
    ]);

    expect(ranking.map((line) => line.place)).toEqual([1, 1, 3, 4]);
    expect(ranking.map((line) => line.pointsAwarded)).toEqual([3, 3, 1, 0]);
  });

  it("skips the place after a tie in the middle", () => {
    const ranking = rankGame([
      scored("Mika", 40),
      scored("Nova", 30),
      scored("Zippy", 30),
      scored("Biscuit", 10),
    ]);

    expect(ranking.map((line) => line.place)).toEqual([1, 2, 2, 4]);
    expect(ranking.map((line) => line.pointsAwarded)).toEqual([3, 2, 2, 0]);
  });

  it("gives every player N − 1 points when all are tied", () => {
    const ranking = rankGame([scored("Mika", 10), scored("Nova", 10), scored("Zippy", 10)]);

    expect(ranking.map((line) => line.place)).toEqual([1, 1, 1]);
    expect(ranking.map((line) => line.pointsAwarded)).toEqual([2, 2, 2]);
  });

  it("orders tied players by pseudo, ignoring case and accents", () => {
    const ranking = rankGame([scored("zoe", 10), scored("Émile", 10), scored("alice", 10)]);

    expect(ranking.map((line) => line.playerId)).toEqual(["id-alice", "id-Émile", "id-zoe"]);
  });

  it("ranks a single player first with no point", () => {
    const ranking = rankGame([scored("Mika", 42)]);

    expect(ranking).toEqual([{ playerId: "id-Mika", place: 1, score: 42, pointsAwarded: 0 }]);
  });
});

describe("rankCumulative", () => {
  it("adds the points of the game and reports the previous place", () => {
    const standings = rankCumulative([
      { playerId: "a", pseudo: "Mika", pointsBefore: 5, pointsAwarded: 0 },
      { playerId: "b", pseudo: "Nova", pointsBefore: 3, pointsAwarded: 3 },
    ]);

    expect(standings).toEqual([
      { playerId: "b", points: 6, place: 1, previousPlace: 2 },
      { playerId: "a", points: 5, place: 2, previousPlace: 1 },
    ]);
  });

  it("keeps the same place when nobody moves", () => {
    const standings = rankCumulative([
      { playerId: "a", pseudo: "Mika", pointsBefore: 5, pointsAwarded: 1 },
      { playerId: "b", pseudo: "Nova", pointsBefore: 3, pointsAwarded: 1 },
    ]);

    expect(standings.map((line) => [line.place, line.previousPlace])).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it("gives tied players the same place and skips the next one", () => {
    const standings = rankCumulative([
      { playerId: "a", pseudo: "Mika", pointsBefore: 2, pointsAwarded: 2 },
      { playerId: "b", pseudo: "Nova", pointsBefore: 4, pointsAwarded: 0 },
      { playerId: "c", pseudo: "Zippy", pointsBefore: 0, pointsAwarded: 1 },
    ]);

    expect(standings.map((line) => [line.playerId, line.place])).toEqual([
      ["a", 1],
      ["b", 1],
      ["c", 3],
    ]);
  });
});
