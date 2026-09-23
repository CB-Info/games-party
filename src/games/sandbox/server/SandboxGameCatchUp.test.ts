import { describe, expect, it } from "vitest";

import { MOVE_BUDGET_CAP_MS } from "../../../shared/constants";
import { SANDBOX_SPEED_DEFAULT } from "../shared/constants";
import { SandboxGame } from "./SandboxGame";
import { contextOver, OPTIONS, person, viewOf } from "./SandboxGame.fixture";

/** « Rattrapage » at 300 ms, the length suggested for trying it at 1000 units a second. */
const CATCHING_UP = { ...OPTIONS, catchUpMs: 300 };
/** One tick of the real loop, in milliseconds (docs/architecture.md, §13). */
const TICK_MS = 1000 / 30;

describe("SandboxGame with « Rattrapage »", () => {
  function xOf(game: SandboxGame): number {
    return viewOf(game, "a").players[0]?.x ?? Number.NaN;
  }

  it("never moves a cursor further in one tick than today, even after standing still", () => {
    // Half a second still fills the budget up to its reserve; then one huge input. Paid from a
    // fresh recharge on top of that reserve, the cursor would jump half as far again (§9).
    for (const catchUpMs of [0, 300]) {
      const game = new SandboxGame(contextOver([person("a")]), { ...OPTIONS, catchUpMs });
      for (let index = 0; index < 15; index += 1) {
        game.tick(TICK_MS);
      }

      const before = xOf(game);
      game.onInput("a", { seq: 0, dx: 2000, dy: 0 });
      game.tick(TICK_MS);

      const reserve = (SANDBOX_SPEED_DEFAULT * MOVE_BUDGET_CAP_MS) / 1000;
      expect(Math.abs(xOf(game) - before)).toBeLessThanOrEqual(reserve + 0.1);
    }
  });

  it("finishes a cut gesture once the hand has stopped, and no further than the leash", () => {
    const game = new SandboxGame(contextOver([person("a")]), CATCHING_UP);
    game.tick(TICK_MS);
    const start = xOf(game);

    // One input asking for far more than the budget, then nothing at all.
    game.onInput("a", { seq: 0, dx: 1000, dy: 0 });
    for (let index = 0; index < 30; index += 1) {
      game.tick(TICK_MS);
    }

    // What one tick's recharge paid at once, plus the leash — 300 ms at 1000 units a second, so
    // three hundred units — paid over the ticks that followed. Everything beyond is lost.
    const paidAtOnce = (SANDBOX_SPEED_DEFAULT * TICK_MS) / 1000;
    const leash = (SANDBOX_SPEED_DEFAULT * CATCHING_UP.catchUpMs) / 1000;
    expect(Math.abs(xOf(game) - start)).toBeCloseTo(paidAtOnce + leash, 0);
    expect(viewOf(game, "a").me?.backlog).toEqual({ x: 0, y: 0 });
  });

  it("sends a player what they still owe, so that their prediction can glide too", () => {
    const game = new SandboxGame(contextOver([person("a")]), CATCHING_UP);
    game.tick(TICK_MS);
    game.onInput("a", { seq: 0, dx: 1000, dy: 0 });

    expect(Math.abs(viewOf(game, "a").me?.backlog.x ?? 0)).toBeGreaterThan(0);
  });

  it("forgets what a player owed when they come back", () => {
    const game = new SandboxGame(contextOver([person("a")]), CATCHING_UP);
    game.tick(TICK_MS);
    game.onInput("a", { seq: 0, dx: 1000, dy: 0 });

    // Otherwise the returning cursor would finish a gesture made before the connection dropped.
    game.onPlayerReconnect("a");

    expect(viewOf(game, "a").me?.backlog).toEqual({ x: 0, y: 0 });
  });
});
