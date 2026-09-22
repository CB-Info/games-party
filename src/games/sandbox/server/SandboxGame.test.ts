import { describe, expect, it } from "vitest";

import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import { ARENA_HEIGHT, ARENA_WIDTH } from "../../../shared/constants";
import { WALLS } from "../../cursor-tag/shared/map";
import type { GameContext, GamePlayer } from "../../gameServer.types";
import { SANDBOX_CURSOR_RADIUS } from "../shared/constants";
import type { SandboxView } from "../shared/types";
import { SandboxGame } from "./SandboxGame";

const DURATION_S = 60;

function contextOver(players: GamePlayer[]): GameContext {
  return {
    players: () => players,
    emitEvent: () => undefined,
    getHostId: () => players[0]?.playerId ?? null,
    // Fixed, so that spawn points are dealt the same way in every run (règle d'or 7).
    random: () => 0.42,
  };
}

function person(playerId: string, connected = true): GamePlayer {
  return { playerId, color: "c1", isBot: false, connected };
}

function viewOf(game: SandboxGame, playerId: string): SandboxView {
  return game.getViewFor({ playerId });
}

/** Moves a player far enough to reach any wall, over as many inputs as the budget needs. */
function push(game: SandboxGame, playerId: string, dx: number, dy: number, times = 40): void {
  for (let index = 0; index < times; index += 1) {
    game.tick(100);
    game.onInput(playerId, { seq: index, dx, dy });
  }
}

describe("SandboxGame", () => {
  it("places everyone somewhere inside the arena", () => {
    const game = new SandboxGame(contextOver([person("a"), person("b")]), {
      durationS: DURATION_S,
    });

    for (const player of viewOf(game, "a").players) {
      expect(player.x).toBeGreaterThanOrEqual(SANDBOX_CURSOR_RADIUS);
      expect(player.x).toBeLessThanOrEqual(ARENA_WIDTH - SANDBOX_CURSOR_RADIUS);
      expect(player.y).toBeGreaterThanOrEqual(SANDBOX_CURSOR_RADIUS);
      expect(player.y).toBeLessThanOrEqual(ARENA_HEIGHT - SANDBOX_CURSOR_RADIUS);
    }
  });

  it("ends when its duration runs out, and not before", () => {
    const game = new SandboxGame(contextOver([person("a")]), { durationS: 1 });

    game.tick(999);
    expect(game.isOver()).toBe(false);

    game.tick(1);
    expect(game.isOver()).toBe(true);
    expect(viewOf(game, "a").timeLeftMs).toBe(0);
  });

  it("never lets a cursor through a wall or out of the arena", () => {
    const game = new SandboxGame(contextOver([person("a")]), { durationS: DURATION_S });

    // Eight directions, one after another: whatever the spawn point, some of them hit something.
    for (const [dx, dy] of [
      [500, 0],
      [-500, 0],
      [0, 500],
      [0, -500],
      [400, 400],
      [-400, -400],
      [400, -400],
      [-400, 400],
    ]) {
      push(game, "a", dx ?? 0, dy ?? 0, 10);
    }

    const me = viewOf(game, "a").players[0];
    expect(me).toBeDefined();
    expect(me?.x).toBeGreaterThanOrEqual(SANDBOX_CURSOR_RADIUS);
    expect(me?.x).toBeLessThanOrEqual(ARENA_WIDTH - SANDBOX_CURSOR_RADIUS);

    const inAWall = WALLS.some(
      (wall) =>
        (me?.x ?? 0) > wall.x - SANDBOX_CURSOR_RADIUS &&
        (me?.x ?? 0) < wall.x + wall.width + SANDBOX_CURSOR_RADIUS &&
        (me?.y ?? 0) > wall.y - SANDBOX_CURSOR_RADIUS &&
        (me?.y ?? 0) < wall.y + wall.height + SANDBOX_CURSOR_RADIUS,
    );
    expect(inAWall).toBe(false);
  });

  it("leaves a player who is away exactly where they were", () => {
    const away = person("a", false);
    const game = new SandboxGame(contextOver([away, person("b")]), { durationS: DURATION_S });
    const before = viewOf(game, "b").players.find((player) => player.playerId === "a");

    push(game, "a", 200, 0, 5);

    const after = viewOf(game, "b").players.find((player) => player.playerId === "a");
    expect(after?.x).toBe(before?.x);
    expect(after?.connected).toBe(false);
  });

  it("forgets the sequence it had seen when a player comes back", () => {
    const game = new SandboxGame(contextOver([person("a")]), { durationS: DURATION_S });
    game.tick(100);
    game.onInput("a", { seq: 7, dx: 10, dy: 0 });
    expect(viewOf(game, "a").me?.lastProcessedSeq).toBe(7);

    // A returning client counts from zero again, so anything it sends must be taken (§6.5).
    game.onPlayerReconnect("a");

    expect(viewOf(game, "a").me?.lastProcessedSeq).toBe(NO_SEQ_PROCESSED);
  });

  it("ranks by distance travelled, furthest first", () => {
    const game = new SandboxGame(contextOver([person("a"), person("b")]), {
      durationS: DURATION_S,
    });

    push(game, "a", 40, 0, 6);
    push(game, "b", 5, 0, 2);

    const ranking = game.getRanking();
    expect(ranking.map((line) => line.playerId)).toEqual(["a", "b"]);
    expect(ranking[0]?.score).toBeGreaterThan(ranking[1]?.score ?? 0);
  });

  it("shows a spectator the players without giving them one of their own", () => {
    const game = new SandboxGame(contextOver([person("a")]), { durationS: DURATION_S });

    const view = game.getViewFor({ spectator: true });

    expect(view.players).toHaveLength(1);
    expect(view.me).toBeNull();
  });

  it("drops a player who left from the view and from the ranking", () => {
    const game = new SandboxGame(contextOver([person("a"), person("b")]), {
      durationS: DURATION_S,
    });

    game.onPlayerLeave("b");

    expect(viewOf(game, "a").players.map((player) => player.playerId)).toEqual(["a"]);
    expect(game.getRanking().map((line) => line.playerId)).toEqual(["a"]);
  });
});
