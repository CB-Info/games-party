import { describe, expect, it } from "vitest";

import { defaultOptions, settingsFor } from "../logic/cursorTagOptions";
import { cursorTagBot } from "./bot";
import { TICK_MS, openRoom, type TestRoom } from "./CursorTagGame.fixture";

const BOTS = ["bot-1", "bot-2", "bot-3", "bot-4"];

/** A default game: three rounds of a minute, and a preparation before each (rules.md, §3). */
const DEFAULT = settingsFor(defaultOptions());

/** The same draws in every run (règle d'or 7), and not a constant: bots must not walk in step. */
function seededRandom(): () => number {
  let seed = 1;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Plays every bot once, the way `BotRunner` does at the start of a tick, then the tick. */
function playTick(room: TestRoom, random: () => number): void {
  for (const bot of BOTS) {
    const view = room.game.getViewFor({ playerId: bot });
    const input = cursorTagBot.nextInput(view, bot, TICK_MS, random);
    if (input !== null) {
      room.game.onInput(bot, input);
    }
    const action = cursorTagBot.nextAction(view, bot);
    if (action !== null) {
      room.game.onAction(bot, action);
    }
  }
  room.game.tick(TICK_MS);
}

describe("a game of Cursor Tag played by bots alone", () => {
  it("plays every round of a default game to its end, with tags along the way", () => {
    const room = openRoom(BOTS, { bots: BOTS, settings: DEFAULT });
    const random = seededRandom();

    for (let ticks = 0; !room.game.isOver(); ticks += 1) {
      if (ticks > 10_000) {
        throw new Error("the game never ended");
      }
      playTick(room, random);
    }

    // Each round: the four bots ready at once, the countdown they start, the round, its end.
    const milestones = room.events
      .filter((event) => event.type !== "tag" && event.type !== "portal")
      .map((event) => `${event.type}:${String(event.round ?? event.playerId)}`);
    const round = (number: number): string[] => [
      ...BOTS.map((bot) => `readyChanged:${bot}`),
      `preparationCountdown:${number}`,
      `roundStart:${number}`,
      `roundEnd:${number}`,
    ];
    expect(milestones).toEqual([...round(1), ...round(2), ...round(3)]);
    expect(room.eventsOfType("preparationCountdown").every((event) => event.auto === false)).toBe(
      true,
    );
    expect(room.eventsOfType("tag").length).toBeGreaterThan(0);
    expect(
      room.game
        .getRanking()
        .map((entry) => entry.playerId)
        .sort(),
    ).toEqual(BOTS);
  });
});
