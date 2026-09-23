import { describe, expect, it } from "vitest";

import type { Point, Wall } from "../../../shared/cursor/collision";
import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import { SANDBOX_SPEED_DEFAULT } from "../shared/constants";
import {
  applyInput,
  rechargePlayers,
  roundPosition,
  spawnPlayers,
  type SandboxPlayer,
} from "./sandboxState";

const SPAWNS: Point[] = [
  { x: 100, y: 100 },
  { x: 200, y: 200 },
  { x: 300, y: 300 },
];

/** A player with room to move, used by the input tests. */
function playerAt(x: number, y: number, budget = 1000): SandboxPlayer {
  return {
    playerId: "p1",
    position: { x, y },
    budget,
    lastProcessedSeq: NO_SEQ_PROCESSED,
    distance: 0,
  };
}

describe("spawnPlayers", () => {
  it("gives everyone a spawn point and an empty budget", () => {
    const players = spawnPlayers(["a", "b"], SPAWNS, () => 0);

    expect(players.map((player) => player.playerId)).toEqual(["a", "b"]);
    expect(players.every((player) => player.budget === 0)).toBe(true);
    expect(players.every((player) => player.lastProcessedSeq === NO_SEQ_PROCESSED)).toBe(true);
  });

  it("gives two different points to two players", () => {
    const players = spawnPlayers(["a", "b"], SPAWNS, () => 0.5);

    expect(players[0]?.position).not.toEqual(players[1]?.position);
  });

  it("shuffles with the randomness it is given, never with its own", () => {
    const first = spawnPlayers(["a"], SPAWNS, () => 0);
    const same = spawnPlayers(["a"], SPAWNS, () => 0);

    expect(same[0]?.position).toEqual(first[0]?.position);
  });
});

describe("applyInput", () => {
  it("moves the cursor and counts the distance", () => {
    const moved = applyInput(
      playerAt(400, 400),
      { seq: 0, dx: 30, dy: 40 },
      { walls: [], connected: true, maxSpeed: SANDBOX_SPEED_DEFAULT },
    );

    expect(moved.position.x).toBeCloseTo(430, 6);
    expect(moved.distance).toBeCloseTo(50, 6);
    expect(moved.lastProcessedSeq).toBe(0);
  });

  it("records the sequence number it was given", () => {
    const moved = applyInput(
      playerAt(400, 400),
      { seq: 5, dx: 10, dy: 0 },
      { walls: [], connected: true, maxSpeed: SANDBOX_SPEED_DEFAULT },
    );

    // Whether that input was new is the caller's decision: a bot has no sequence to check.
    expect(moved.lastProcessedSeq).toBe(5);
  });

  it("records the sequence of a player who is away without moving them", () => {
    const away = applyInput(
      playerAt(400, 400),
      { seq: 3, dx: 100, dy: 0 },
      { walls: [], connected: false, maxSpeed: SANDBOX_SPEED_DEFAULT },
    );

    // Their cursor stays put, but the sequence moves on: nothing replays when they come back.
    expect(away.position).toEqual({ x: 400, y: 400 });
    expect(away.distance).toBe(0);
    expect(away.lastProcessedSeq).toBe(3);
  });

  it("counts only the distance actually travelled when a wall gets in the way", () => {
    const wall: Wall[] = [{ x: 500, y: 0, width: 40, height: 900 }];
    const blocked = applyInput(
      playerAt(400, 400),
      { seq: 0, dx: 300, dy: 0 },
      { walls: wall, connected: true, maxSpeed: SANDBOX_SPEED_DEFAULT },
    );

    expect(blocked.distance).toBeLessThan(100);
    expect(blocked.position.x).toBeLessThan(500);
  });
});

describe("rechargePlayers", () => {
  it("refills every budget", () => {
    const recharged = rechargePlayers(
      [playerAt(0, 0, 0), playerAt(0, 0, 10)],
      50,
      SANDBOX_SPEED_DEFAULT,
    );

    expect(recharged[0]?.budget).toBeCloseTo((SANDBOX_SPEED_DEFAULT * 50) / 1000, 6);
    expect(recharged[1]?.budget).toBeCloseTo(10 + (SANDBOX_SPEED_DEFAULT * 50) / 1000, 6);
  });
});

describe("roundPosition", () => {
  it("keeps one decimal", () => {
    expect(roundPosition(812.3456)).toBe(812.3);
    expect(roundPosition(812.35)).toBe(812.4);
    expect(roundPosition(-0.04)).toBe(-0);
  });
});
