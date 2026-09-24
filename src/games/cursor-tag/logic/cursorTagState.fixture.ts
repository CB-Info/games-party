import type { Point } from "../../../shared/cursor/collision";
import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import { PREPARATION_AUTO_START_MS, PREPARATION_COUNTDOWN_MS } from "../shared/constants";
import { defaultOptions, settingsFor } from "./cursorTagOptions";
import type { TagSettings } from "./cursorTagOptions";
import type {
  PreparationState,
  RoundPlayer,
  RoundState,
  RuleContext,
  TagMember,
} from "./cursorTagState";

/**
 * Builders shared by the tests of Cursor Tag's rules. Never imported by production code. Each
 * builder gives the state a rule starts from, with only what a test changes spelled out.
 */

/** The settings of a game with default options (rules.md, §3). */
export const SETTINGS = settingsFor(defaultOptions());

/**
 * The catch-up leash the tests play at: the game's own `CATCH_UP_MS` is 0 until a real game has
 * decided (rules.md, §15.3), and at 0 there is no remainder to test.
 */
export const CATCH_UP_TEST_MS = 300;

/** A spot far from every wall and portal, with room to move around it (rules.md, §6.5). */
export const OPEN_GROUND: Point = { x: 800, y: 250 };

export function member(playerId: string, changes: Partial<TagMember> = {}): TagMember {
  return { playerId, scoreMs: 0, lastProcessedSeq: NO_SEQ_PROCESSED, ...changes };
}

/** A player standing still at `position` since the previous tick, as a round starts them. */
function roundPlayer(
  playerId: string,
  role: RoundPlayer["role"],
  position: Point,
  changes: Partial<RoundPlayer>,
): RoundPlayer {
  return {
    ...member(playerId),
    role,
    position,
    tickStart: position,
    budget: 0,
    backlog: { x: 0, y: 0 },
    frozenMsLeft: 0,
    portalCooldownMs: { A: 0, B: 0 },
    ...changes,
  };
}

export function runner(
  playerId: string,
  position: Point = OPEN_GROUND,
  changes: Partial<RoundPlayer> = {},
): RoundPlayer {
  return roundPlayer(playerId, "runner", position, changes);
}

/** A Chat free to tag: not frozen, unless a test says so. */
export function chat(
  playerId: string,
  position: Point = OPEN_GROUND,
  changes: Partial<RoundPlayer> = {},
): RoundPlayer {
  return roundPlayer(playerId, "chat", position, changes);
}

/** A round in its first round of the default game, as many Chats as it started with. */
export function roundOf(players: RoundPlayer[], changes: Partial<RoundState> = {}): RoundState {
  return {
    phase: "round",
    round: 1,
    players,
    timeLeftMs: SETTINGS.roundMs,
    chatsAtStart: players.filter((player) => player.role === "chat").length,
    ...changes,
  };
}

/** The waiting step of a preparation, as it begins unless a test says otherwise. */
export function waitingOf(
  players: TagMember[],
  readyIds: string[] = [],
  changes: Partial<PreparationState> = {},
): PreparationState {
  return {
    phase: "preparation",
    round: 1,
    players,
    readyIds,
    step: { kind: "waiting", autoStartMsLeft: PREPARATION_AUTO_START_MS },
    ...changes,
  };
}

/** The countdown of a preparation, as it begins unless a test says otherwise. */
export function countdownOf(
  players: TagMember[],
  countdownMsLeft = PREPARATION_COUNTDOWN_MS,
  changes: Partial<PreparationState> = {},
): PreparationState {
  return waitingOf(players, [], { step: { kind: "countdown", countdownMsLeft }, ...changes });
}

/** Randomness a test does not expect to be drawn: any draw fails the test. */
export function neverDrawn(): number {
  throw new Error("no random draw expected");
}

/**
 * What the rules read besides the state. Everyone is connected but the players listed as `away`,
 * and randomness is not drawn unless a test gives some.
 */
export function rulesWith(
  context: { settings?: TagSettings; away?: readonly string[]; random?: () => number } = {},
): RuleContext {
  const away = context.away ?? [];

  return {
    settings: context.settings ?? SETTINGS,
    isConnected: (playerId) => !away.includes(playerId),
    random: context.random ?? neverDrawn,
  };
}
