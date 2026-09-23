import { describe, expect, it } from "vitest";

import { ARENA_HEIGHT, ARENA_WIDTH } from "../../../shared/constants";
import { WALLS } from "../../cursor-tag/shared/map";
import { SANDBOX_CURSOR_RADIUS } from "../shared/constants";
import type { SandboxView } from "../shared/types";
import { sandboxBot } from "./bot";

const BOT = "bot-1";

function viewAt(x: number, y: number, timeLeftMs = 40_000): SandboxView {
  return {
    timeLeftMs,
    players: [{ playerId: BOT, x, y, connected: true, distance: 0 }],
    me: null,
  };
}

/** Where the bot asks to go from a position, as a unit vector. */
function headingFrom(x: number, y: number, timeLeftMs?: number): { x: number; y: number } {
  const input = sandboxBot.nextInput(viewAt(x, y, timeLeftMs), BOT, 33, () => 0.5);
  if (input === null) {
    throw new Error("The bot refused to play");
  }

  const length = Math.hypot(input.dx, input.dy);
  return { x: input.dx / length, y: input.dy / length };
}

describe("sandboxBot", () => {
  it("plays nothing for a bot that is not in the game", () => {
    const view = viewAt(800, 450);
    view.players = [];

    expect(sandboxBot.nextInput(view, BOT, 33, () => 0.5)).toBeNull();
  });

  it("keeps no state: the same view always gives the same move", () => {
    const first = sandboxBot.nextInput(viewAt(800, 200), BOT, 33, () => 0.5);
    const again = sandboxBot.nextInput(viewAt(800, 200), BOT, 33, () => 0.5);

    expect(again).toEqual(first);
  });

  it("turns back inside when it reaches a wall of the arena", () => {
    // Pressed against each edge in turn: the move must point away from it, or the bot would push
    // into the border for the rest of the game and stop exercising the middle of the arena.
    expect(headingFrom(SANDBOX_CURSOR_RADIUS, 450).x).toBeGreaterThan(0);
    expect(headingFrom(ARENA_WIDTH - SANDBOX_CURSOR_RADIUS, 450).x).toBeLessThan(0);
    expect(headingFrom(800, SANDBOX_CURSOR_RADIUS).y).toBeGreaterThan(0);
    expect(headingFrom(800, ARENA_HEIGHT - SANDBOX_CURSOR_RADIUS).y).toBeLessThan(0);
  });

  it("never heads straight into a wall it is touching", () => {
    const wall = WALLS[0];
    expect(wall).toBeDefined();

    // Just above the central pillar. The wandering heading turns with the clock, so sweeping a
    // whole turn of it — 2π at TURN_RATE, about 5.2 s — covers every direction the bot could pick,
    // including the ones pointing straight into the pillar.
    const above = { x: (wall?.x ?? 0) + 60, y: (wall?.y ?? 0) - SANDBOX_CURSOR_RADIUS - 1 };

    for (let step = 0; step < 36; step += 1) {
      const heading = headingFrom(above.x, above.y, 40_000 - step * 145);
      const ahead = { x: above.x + heading.x * 60, y: above.y + heading.y * 60 };
      const insidePillar =
        ahead.x > (wall?.x ?? 0) - SANDBOX_CURSOR_RADIUS &&
        ahead.x < (wall?.x ?? 0) + (wall?.width ?? 0) + SANDBOX_CURSOR_RADIUS &&
        ahead.y > (wall?.y ?? 0) - SANDBOX_CURSOR_RADIUS &&
        ahead.y < (wall?.y ?? 0) + (wall?.height ?? 0) + SANDBOX_CURSOR_RADIUS;

      expect(insidePillar).toBe(false);
    }
  });

  it("keeps its slow arc when nothing is in the way", () => {
    // In the open, the heading follows the clock: two different moments, two different headings.
    const early = headingFrom(800, 200, 40_000);
    const later = headingFrom(800, 200, 39_000);

    expect(later).not.toEqual(early);
  });
});
