import { describe, expect, it } from "vitest";

import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  INPUT_SEND_RATE,
  SERVER_TICK_RATE,
} from "../../../shared/constants";
import { overlapsAnyWall, type Point, type Wall } from "../../../shared/cursor/collision";
import { budgetCap, moveCursor } from "../../../shared/cursor/moveCursor";
import {
  CURSOR_RADIUS,
  FREEZE_DURATION_S_MAX,
  MAX_PLAYERS,
  PORTAL_COOLDOWN_MS,
  PREPARATION_AUTO_START_MS,
  PREPARATION_COUNTDOWN_MS,
  ROUND_COUNT_MAX,
  ROUND_DURATION_S_MAX,
  RUNNER_MAX_SPEED,
} from "../shared/constants";
import { WALLS } from "../shared/map";
import { buildView } from "./buildView";
import { CATCH_UP_TEST_MS, chat, roundOf, runner } from "./cursorTagState.fixture";
import { maxSpeedOf } from "./movement";
import { readView } from "./readView";

/**
 * The budget of a round view for ten players at its worst, whole Socket.IO frame included
 * (architecture §7): it measured 541 bytes when the format was settled. A view that grows past it
 * shows up here before it shows up on Render's bill.
 */
const WORST_ROUND_FRAME_BYTES = 550;

/** A hair under a value, so that rounding it keeps every digit it can have. */
const HAIR = 0.45;

/** The longest a game can last, every round at its longest and every waiting run out. */
const LONGEST_GAME_S =
  ROUND_COUNT_MAX *
  (ROUND_DURATION_S_MAX + (PREPARATION_AUTO_START_MS + PREPARATION_COUNTDOWN_MS) / 1000);

/** Twelve characters, as long as a real player identifier (`SESSION_PLAYER_ID_LENGTH`). */
function playerIdOf(index: number): string {
  return `player-${String(index).padStart(5, "0")}`;
}

/** What Socket.IO puts on the wire for a view: its text frame, plus the WebSocket header. */
function frameBytes(view: unknown): number {
  const payload = {
    tick: Math.round(LONGEST_GAME_S * SERVER_TICK_RATE),
    // Any date of this century takes thirteen digits.
    serverTime: 1_790_000_000_000,
    view,
  };
  const text = `42${JSON.stringify(["game:view", payload])}`;
  const bytes = new TextEncoder().encode(text).length;
  return bytes + (bytes > 125 ? 4 : 2);
}

describe("the size of a round view", () => {
  it("stays within its budget for ten players, with every number at its longest", () => {
    // The remainder at its longest is the leash, which the tests' catch-up sets (rules.md, §6.2).
    const leash = (maxSpeedOf("chat") * CATCH_UP_TEST_MS) / 1000;
    const players = Array.from({ length: MAX_PLAYERS }, (_, index) =>
      (index === 0 ? chat : runner)(
        playerIdOf(index),
        { x: ARENA_WIDTH - CURSOR_RADIUS - HAIR, y: ARENA_HEIGHT - CURSOR_RADIUS - HAIR },
        {
          frozenMsLeft: FREEZE_DURATION_S_MAX * 1000 - HAIR,
          scoreMs: ROUND_COUNT_MAX * ROUND_DURATION_S_MAX * 1000 - HAIR,
          lastProcessedSeq: Math.round(LONGEST_GAME_S * INPUT_SEND_RATE),
          budget: budgetCap(maxSpeedOf("chat")) - HAIR / 10,
          portalCooldownMs: { A: PORTAL_COOLDOWN_MS - HAIR, B: PORTAL_COOLDOWN_MS - HAIR },
          backlog: { x: -leash / Math.SQRT2, y: -leash / Math.SQRT2 },
        },
      ),
    );
    const round = roundOf(players, {
      round: ROUND_COUNT_MAX,
      timeLeftMs: ROUND_DURATION_S_MAX * 1000 - HAIR,
    });

    const view = buildView(round, { playerId: playerIdOf(1) }, () => true);

    expect(playerIdOf(1)).toHaveLength(12);
    expect(frameBytes(view)).toBeLessThanOrEqual(WORST_ROUND_FRAME_BYTES);
  });
});

/**
 * A point just outside the pillar's top-left corner that rounds to the unit inside it: every half
 * unit is tried, from the corner outwards, so that the probe follows the radius and the map.
 */
function pointRoundingIntoCorner(pillar: Wall): Point {
  for (let dy = 0; dy <= 2 * CURSOR_RADIUS; dy += 0.5) {
    for (let dx = 0; dx <= 2 * CURSOR_RADIUS; dx += 0.5) {
      const point = { x: pillar.x - dx, y: pillar.y - dy };
      const atTheUnit = { x: Math.round(point.x), y: Math.round(point.y) };
      if (
        !overlapsAnyWall(point, CURSOR_RADIUS, WALLS) &&
        overlapsAnyWall(atTheUnit, CURSOR_RADIUS, WALLS)
      ) {
        return point;
      }
    }
  }
  throw new Error("no point near the corner rounds into it");
}

describe("the precision of the recipient's own position", () => {
  it("never puts their prediction inside a wall corner the server's cursor clears", () => {
    // At the unit, this position lands inside the corner of the central pillar, and the replay
    // of the next move would stop against it (rules.md, §8.2).
    const pillar = WALLS[0];
    if (pillar === undefined) {
      throw new Error("the map has no central pillar");
    }
    const position = pointRoundingIntoCorner(pillar);
    const view = readView(
      buildView(roundOf([runner("nova", position)]), { playerId: "nova" }, () => true),
    );
    if (view.phase !== "round" || view.players[0] === undefined) {
      throw new Error("expected a round with Nova in it");
    }
    const fromView = { x: view.players[0].x, y: view.players[0].y };
    // Round the corner: up and to the right, as far as a whole reserve allows.
    const move = (from: Point): Point =>
      moveCursor({
        position: from,
        delta: { x: budgetCap(RUNNER_MAX_SPEED), y: -budgetCap(RUNNER_MAX_SPEED) },
        budget: budgetCap(RUNNER_MAX_SPEED),
        maxSpeed: RUNNER_MAX_SPEED,
        radius: CURSOR_RADIUS,
        walls: WALLS,
      }).position;

    expect(overlapsAnyWall(fromView, CURSOR_RADIUS, WALLS)).toBe(false);
    expect(move(fromView)).toEqual(move(position));
  });
});
