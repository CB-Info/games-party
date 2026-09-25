import { snapToStep } from "../../../shared/snapToStep";
import {
  CATCH_UP_MS,
  CHAT_COUNT_DEFAULT,
  CHAT_COUNT_MIN,
  CHAT_COUNT_STEP,
  FREEZE_DURATION_S_DEFAULT,
  FREEZE_DURATION_S_MAX,
  FREEZE_DURATION_S_MIN,
  FREEZE_DURATION_S_STEP,
  ROUND_COUNT_DEFAULT,
  ROUND_COUNT_MAX,
  ROUND_COUNT_MIN,
  ROUND_COUNT_STEP,
  ROUND_DURATION_S_DEFAULT,
  ROUND_DURATION_S_MAX,
  ROUND_DURATION_S_MIN,
  ROUND_DURATION_S_STEP,
  TAG_REWIND_TICKS,
} from "../shared/constants";
import type { CursorTagOptions } from "../shared/schemas";

/**
 * What the rules read of a game's options, in the units they compute in. The catch-up leash and
 * the rewind are not options the host sets: they are provisional decisions (rules.md, §15), carried
 * here so that the tests can play the rules at another value than the one of `constants.ts`.
 */
export interface TagSettings {
  roundCount: number;
  /** The number of Chats the host set, before the bounds of the round's start (rules.md, §4). */
  chatCount: number;
  roundMs: number;
  freezeMs: number;
  /** Milliseconds of travel at the role's speed a remainder may hold (rules.md, §6.2). */
  catchUpMs: number;
  /** How many ticks back a Runner's path is taken for a tag (rules.md, §6.3). */
  rewindTicks: number;
}

/** The options of a new game (rules.md, §3). One Chat is allowed whatever the number of players. */
export function defaultOptions(): CursorTagOptions {
  return {
    chatCount: CHAT_COUNT_DEFAULT,
    roundCount: ROUND_COUNT_DEFAULT,
    roundDurationS: ROUND_DURATION_S_DEFAULT,
    freezeDurationS: FREEZE_DURATION_S_DEFAULT,
  };
}

/**
 * The most Chats a game of `playerCount` players may have (rules.md, §3): always at least one Chat
 * and one Runner, so one fewer than the players, and never below one, even for a host alone in the
 * lobby. The lobby's form reads it too, to know when its « + » stops.
 */
export function chatCountMax(playerCount: number): number {
  return Math.max(CHAT_COUNT_MIN, playerCount - 1);
}

/** Brings each option inside its bounds and onto its step (rules.md, §3). */
export function normalizeOptions(options: CursorTagOptions, playerCount: number): CursorTagOptions {
  return {
    chatCount: snapToStep(
      options.chatCount,
      CHAT_COUNT_MIN,
      chatCountMax(playerCount),
      CHAT_COUNT_STEP,
    ),
    roundCount: snapToStep(options.roundCount, ROUND_COUNT_MIN, ROUND_COUNT_MAX, ROUND_COUNT_STEP),
    roundDurationS: snapToStep(
      options.roundDurationS,
      ROUND_DURATION_S_MIN,
      ROUND_DURATION_S_MAX,
      ROUND_DURATION_S_STEP,
    ),
    freezeDurationS: snapToStep(
      options.freezeDurationS,
      FREEZE_DURATION_S_MIN,
      FREEZE_DURATION_S_MAX,
      FREEZE_DURATION_S_STEP,
    ),
  };
}

/**
 * The settings of a game played with these options. The only reader of `CATCH_UP_MS` and
 * `TAG_REWIND_TICKS`: every rule takes them from here.
 */
export function settingsFor(options: CursorTagOptions): TagSettings {
  return {
    roundCount: options.roundCount,
    chatCount: options.chatCount,
    roundMs: options.roundDurationS * 1000,
    // One freeze length for both freezes: the tagged Runner's and the Chats' at a round's start.
    freezeMs: options.freezeDurationS * 1000,
    catchUpMs: CATCH_UP_MS,
    rewindTicks: TAG_REWIND_TICKS,
  };
}
