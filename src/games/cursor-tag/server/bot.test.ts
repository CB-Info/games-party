import { describe, expect, it } from "vitest";

import { overlapsAnyWall } from "../../../shared/cursor/collision";
import type { CursorInput } from "../../../shared/cursor/cursorInput";
import { buildView } from "../logic/buildView";
import type { PreparationState, RoundPlayer, RoundState } from "../logic/cursorTagState";
import {
  OPEN_GROUND,
  TICK_MS,
  chat,
  countdownOf,
  member,
  nearby,
  roundOf,
  runner,
  waitingOf,
} from "../logic/cursorTagState.fixture";
import { maxSpeedOf } from "../logic/movement";
import {
  BOT_JITTER_RAD,
  BOT_LOOK_AHEAD,
  BOT_WANDER_CHANGE_MS,
  CURSOR_RADIUS,
} from "../shared/constants";
import { WALLS } from "../shared/map";
import { cursorTagBot } from "./bot";

const BOT = "bot-1";
/** No jitter: `random() * 2 − 1` is then zero. */
const STEADY = (): number => 0.5;

function inputFor(
  state: PreparationState | RoundState,
  options: { away?: readonly string[]; random?: () => number; bot?: string } = {},
): CursorInput | null {
  const bot = options.bot ?? BOT;
  const view = buildView(state, { playerId: bot }, (id) => !(options.away ?? []).includes(id));
  return cursorTagBot.nextInput(view, bot, TICK_MS, options.random ?? STEADY);
}

/** The direction of the bot's move, in radians. */
function headingOf(state: RoundState, options: Parameters<typeof inputFor>[1] = {}): number {
  const input = inputFor(state, options);
  if (input === null) {
    throw new Error("the bot did not move");
  }
  return Math.atan2(input.dy, input.dx);
}

/** A round where the bot is `bot` and the others are `others`. */
function roundWith(bot: RoundPlayer, others: RoundPlayer[], timeLeftMs = 30_000): RoundState {
  return roundOf([bot, ...others], { timeLeftMs });
}

describe("cursorTagBot moving", () => {
  it("plays nothing outside a round, while frozen, or when it is not in the game", () => {
    const frozen = roundWith(chat(BOT, OPEN_GROUND, { frozenMsLeft: 100 }), [runner("nova")]);

    expect(inputFor(waitingOf([member(BOT)]))).toBeNull();
    expect(inputFor(frozen)).toBeNull();
    expect(inputFor(roundOf([runner("nova")]))).toBeNull();
  });

  it("heads a Chat for the nearest connected Runner", () => {
    const state = roundWith(chat(BOT), [
      runner("near-but-away", nearby(0, 60)),
      runner("nova", nearby(-150)),
      runner("far", nearby(300)),
    ]);

    expect(headingOf(state, { away: ["near-but-away"] })).toBeCloseTo(Math.PI);
  });

  it("heads a Runner away from the nearest Chat free to tag", () => {
    // A frozen Chat and a Chat who is away cannot tag: only the third one is a threat.
    const state = roundWith(runner(BOT), [
      chat("frozen", nearby(40), { frozenMsLeft: 1000 }),
      chat("away", nearby(-40)),
      chat("zippy", nearby(0, 100)),
    ]);

    expect(headingOf(state, { away: ["away"] })).toBeCloseTo(-Math.PI / 2);
  });

  it("wanders the same way for a whole slice of time, then another way", () => {
    // Nobody to flee: the only Chat is frozen. The same slice gives the same direction; the next
    // slice gives another one.
    const at = (timeLeftMs: number): number =>
      headingOf(
        roundWith(runner(BOT), [chat("zippy", nearby(40), { frozenMsLeft: 1000 })], timeLeftMs),
      );

    expect(at(30_000 + BOT_WANDER_CHANGE_MS - 1)).toBe(at(30_000));
    expect(at(30_000 - 1)).not.toBeCloseTo(at(30_000));
  });

  it("wanders another way than the other bots in the same slice of time", () => {
    // Two bots with nobody to chase: were they to wander the same way, they would walk in step.
    const alone = (bot: string): number =>
      headingOf(roundOf([chat(bot, OPEN_GROUND)], { timeLeftMs: 30_000 }), { bot });

    expect(alone("bot-1")).not.toBeCloseTo(alone("bot-2"));
  });

  it("draws unrelated directions from one slice to the next", () => {
    // Uniform directions differ by a quarter turn on average; a weak mix would barely turn.
    const alone = (timeLeftMs: number): number => headingOf(roundWith(chat(BOT), [], timeLeftMs));
    let turned = 0;
    for (let slice = 1; slice <= 100; slice += 1) {
      const step = Math.abs(
        alone(slice * BOT_WANDER_CHANGE_MS) - alone((slice + 1) * BOT_WANDER_CHANGE_MS),
      );
      turned += Math.min(step, 2 * Math.PI - step);
    }

    expect(turned / 100).toBeGreaterThan(Math.PI / 3);
  });

  it("adds a random angle of at most BOT_JITTER_RAD", () => {
    const state = roundWith(chat(BOT), [runner("nova", nearby(150))]);

    expect(headingOf(state, { random: () => 0 })).toBeCloseTo(-BOT_JITTER_RAD);
    expect(headingOf(state, { random: () => 0.75 })).toBeCloseTo(BOT_JITTER_RAD / 2);
  });

  it("moves as far as its role's top speed allows in the tick", () => {
    const asChat = inputFor(roundWith(chat(BOT), [runner("nova", nearby(150))]));
    const asRunner = inputFor(roundWith(runner(BOT), [chat("zippy", nearby(150))]));

    expect(Math.hypot(asChat?.dx ?? 0, asChat?.dy ?? 0)).toBeCloseTo(
      (maxSpeedOf("chat") * TICK_MS) / 1000,
    );
    expect(Math.hypot(asRunner?.dx ?? 0, asRunner?.dy ?? 0)).toBeCloseTo(
      (maxSpeedOf("runner") * TICK_MS) / 1000,
    );
  });

  it("turns away from a wall between it and its prey", () => {
    // Left of the central pillar, with the Runner on its other side.
    const state = roundWith(chat(BOT, { x: 720, y: 450 }), [runner("nova", { x: 900, y: 450 })]);
    const heading = headingOf(state);
    const ahead = {
      x: 720 + Math.cos(heading) * BOT_LOOK_AHEAD,
      y: 450 + Math.sin(heading) * BOT_LOOK_AHEAD,
    };

    expect(heading).not.toBeCloseTo(0);
    expect(overlapsAnyWall(ahead, CURSOR_RADIUS, WALLS)).toBe(false);
  });
});

describe("cursorTagBot getting ready", () => {
  const ready = (state: PreparationState | RoundState) =>
    cursorTagBot.nextAction(
      buildView(state, { playerId: BOT }, () => true),
      BOT,
    );

  it("says it is ready as soon as the waiting begins, and only then", () => {
    expect(ready(waitingOf([member(BOT)]))).toEqual({ type: "ready" });
    expect(ready(waitingOf([member(BOT)], [BOT]))).toBeNull();
    expect(ready(countdownOf([member(BOT)]))).toBeNull();
    expect(ready(roundOf([runner(BOT)]))).toBeNull();
  });
});
