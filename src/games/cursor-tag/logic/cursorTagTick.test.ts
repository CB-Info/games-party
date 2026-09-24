import { describe, expect, it } from "vitest";

import { PREPARATION_AUTO_START_MS, PREPARATION_COUNTDOWN_MS } from "../shared/constants";
import { isOver } from "./cursorTagState";
import { SETTINGS, TICK_MS, member, rulesWith } from "./cursorTagState.fixture";
import { playTick } from "./cursorTagTick";
import { pilotGame } from "./cursorTagTick.fixture";

const PLAYERS = ["a", "b", "c"];

/** More ticks than any single phase of a default game lasts. */
const PHASE_TICKS = Math.ceil(
  (SETTINGS.roundMs + PREPARATION_AUTO_START_MS + PREPARATION_COUNTDOWN_MS) / TICK_MS,
);

describe("playTick", () => {
  it("plays a default game from its first preparation to its end", () => {
    const pilot = pilotGame(PLAYERS, { random: () => 0.5 });

    // Everyone ready for round 1; nobody for the next ones, which start by themselves.
    for (const playerId of PLAYERS) {
      pilot.act(playerId, { type: "ready" });
    }
    pilot.tickUntil(isOver, SETTINGS.roundCount * PHASE_TICKS);

    const flow = pilot.events
      .filter((event) => event.type !== "readyChanged")
      .map((event) => `${event.type}:${String(event.round)}:${String(event.auto ?? "")}`);
    expect(flow).toEqual([
      "preparationCountdown:1:false",
      "roundStart:1:",
      "roundEnd:1:",
      "preparationCountdown:2:true",
      "roundStart:2:",
      "roundEnd:2:",
      "preparationCountdown:3:true",
      "roundStart:3:",
      "roundEnd:3:",
    ]);
  });

  it("keeps the scores from one round to the next", () => {
    const pilot = pilotGame(PLAYERS, { random: () => 0.5 });

    pilot.tickUntil((state) => state.phase === "preparation" && state.round === 2, 2 * PHASE_TICKS);
    const afterOne = pilot.state.players.map((player) => player.scoreMs);
    pilot.tickUntil(isOver, SETTINGS.roundCount * PHASE_TICKS);
    const atTheEnd = pilot.state.players.map((player) => player.scoreMs);

    expect(afterOne.filter((score) => score > 0)).toHaveLength(2);
    atTheEnd.forEach((score, index) => {
      expect(score).toBeGreaterThanOrEqual(afterOne[index] ?? 0);
    });
    expect(atTheEnd.reduce((sum, score) => sum + score, 0)).toBeCloseTo(
      SETTINGS.roundCount * 2 * SETTINGS.roundMs,
      3,
    );
  });

  it("does nothing once the game is over", () => {
    const over = { phase: "over" as const, players: [member("a")] };

    expect(playTick(over, TICK_MS, rulesWith())).toEqual({ state: over, events: [] });
  });
});
