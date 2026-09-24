import { describe, expect, it } from "vitest";

import {
  CATCH_UP_MS,
  CHAT_COUNT_MIN,
  FREEZE_DURATION_S_MAX,
  FREEZE_DURATION_S_MIN,
  MAX_PLAYERS,
  ROUND_COUNT_MAX,
  ROUND_COUNT_MIN,
  ROUND_DURATION_S_MAX,
  ROUND_DURATION_S_MIN,
  TAG_REWIND_TICKS,
} from "../shared/constants";
import type { CursorTagOptions } from "../shared/schemas";
import { defaultOptions, normalizeOptions, settingsFor } from "./cursorTagOptions";

const PLAYER_COUNT = 5;

/** Options on a step and inside the bounds at five players, of which each test changes one. */
const VALID: CursorTagOptions = {
  chatCount: 2,
  roundCount: 3,
  roundDurationS: 60,
  freezeDurationS: 3,
};

function normalized(changes: Partial<CursorTagOptions>, playerCount = PLAYER_COUNT) {
  return normalizeOptions({ ...VALID, ...changes }, playerCount);
}

describe("defaultOptions", () => {
  it("gives options that stay as they are at any number of players", () => {
    for (let playerCount = 1; playerCount <= MAX_PLAYERS; playerCount += 1) {
      expect(normalizeOptions(defaultOptions(), playerCount)).toEqual(defaultOptions());
    }
  });
});

describe("normalizeOptions", () => {
  it("keeps options that are on a step and inside the bounds as they are", () => {
    expect(normalized({})).toEqual(VALID);
  });

  it("brings a value below its lower bound up to it", () => {
    expect(normalized({ chatCount: 0 }).chatCount).toBe(CHAT_COUNT_MIN);
    expect(normalized({ roundCount: -2 }).roundCount).toBe(ROUND_COUNT_MIN);
    expect(normalized({ roundDurationS: 10 }).roundDurationS).toBe(ROUND_DURATION_S_MIN);
    expect(normalized({ freezeDurationS: 0 }).freezeDurationS).toBe(FREEZE_DURATION_S_MIN);
  });

  it("brings a value above its upper bound down to it", () => {
    expect(normalized({ roundCount: 9 }).roundCount).toBe(ROUND_COUNT_MAX);
    expect(normalized({ roundDurationS: 600 }).roundDurationS).toBe(ROUND_DURATION_S_MAX);
    expect(normalized({ freezeDurationS: 12 }).freezeDurationS).toBe(FREEZE_DURATION_S_MAX);
  });

  it("brings a round length off its step to the nearest one", () => {
    // The two examples of rules.md, §3.
    expect(normalized({ roundDurationS: 70 }).roundDurationS).toBe(75);
    expect(normalized({ roundDurationS: 67 }).roundDurationS).toBe(60);
  });

  it("brings too many Chats down to one fewer than the players", () => {
    expect(normalized({ chatCount: 9 }).chatCount).toBe(PLAYER_COUNT - 1);
  });

  it("recomputes the number of Chats when players leave the lobby", () => {
    // Four Chats at five players, then two players leave: three players allow two Chats.
    const atFive = normalized({ chatCount: 4 });

    expect(atFive.chatCount).toBe(4);
    expect(normalizeOptions(atFive, 3).chatCount).toBe(2);
  });

  it("allows one Chat to two players, and to a host alone in the lobby", () => {
    expect(normalized({ chatCount: 3 }, 2).chatCount).toBe(1);
    expect(normalized({ chatCount: 3 }, 1).chatCount).toBe(1);
    expect(normalized({ chatCount: 0 }, 1).chatCount).toBe(1);
  });
});

describe("settingsFor", () => {
  it("gives the round and freeze lengths in milliseconds", () => {
    const settings = settingsFor({ ...VALID, roundDurationS: 45, freezeDurationS: 2 });

    expect(settings.roundMs).toBe(45_000);
    expect(settings.freezeMs).toBe(2_000);
    expect(settings.roundCount).toBe(VALID.roundCount);
    expect(settings.chatCount).toBe(VALID.chatCount);
  });

  it("takes the catch-up leash and the rewind from the game's constants", () => {
    const settings = settingsFor(VALID);

    expect(settings.catchUpMs).toBe(CATCH_UP_MS);
    expect(settings.rewindTicks).toBe(TAG_REWIND_TICKS);
  });
});
