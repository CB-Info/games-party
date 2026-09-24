import type { Point } from "../../../shared/cursor/collision";
import type { PortalPairId } from "../shared/map";
import type { CursorTagEvent, Role } from "../shared/types";
import type { TagSettings } from "./cursorTagOptions";

/**
 * The state of a game of Cursor Tag, and the small helpers every rule shares. Every rule is a pure
 * function from a state to a new one: nothing here is changed in place.
 */

/** What the game keeps of a player whatever the phase. */
export interface TagMember {
  playerId: string;
  scoreMs: number;
  /** The last input applied, which the player's prediction replays from (architecture §6.5). */
  lastProcessedSeq: number;
}

/** A player during a round (rules.md, §6). */
export interface RoundPlayer extends TagMember {
  role: Role;
  position: Point;
  /** Where this tick's path starts (rules.md, §6.3). */
  tickStart: Point;
  budget: number;
  /** Movement owed and not paid yet: always zero without catch-up (rules.md, §6.2). */
  backlog: Point;
  frozenMsLeft: number;
  portalCooldownMs: Record<PortalPairId, number>;
}

/** Between two rounds, and before the first one (rules.md, §4.1). */
export interface PreparationState {
  phase: "preparation";
  /** The round to come, from 1 to `roundCount`. */
  round: number;
  players: TagMember[];
  readyIds: string[];
  step:
    { kind: "waiting"; autoStartMsLeft: number } | { kind: "countdown"; countdownMsLeft: number };
}

/** A round being played (rules.md, §4 and §6). */
export interface RoundState {
  phase: "round";
  round: number;
  players: RoundPlayer[];
  timeLeftMs: number;
  /** How many Chats the round drew: a replacement never goes beyond it (rules.md, §11). */
  chatsAtStart: number;
}

/** After the last round: the room shows the results (rules.md, §4). */
export interface OverState {
  phase: "over";
  players: TagMember[];
}

export type CursorTagState = PreparationState | RoundState | OverState;

/** What a rule needs besides the state: the game's settings, who is connected, and randomness. */
export interface RuleContext {
  settings: TagSettings;
  isConnected(playerId: string): boolean;
  /** A number in [0, 1), from `GameContext.random` (règle d'or 7). */
  random(): number;
}

/** A new state, and the events it produced on the way, in the order they happened. */
export interface Outcome<State extends CursorTagState = CursorTagState> {
  state: State;
  events: CursorTagEvent[];
}

/** The answer to an action (rules.md, §4.1): refused outside the waiting step of a preparation. */
export type ActionResult = ({ ok: true } & Outcome) | { ok: false; error: "INVALID_STATE" };

export function findPlayer<Player extends TagMember>(
  players: readonly Player[],
  playerId: string,
): Player | undefined {
  return players.find((player) => player.playerId === playerId);
}

/** The players, with one of them changed. An unknown identifier changes nothing. */
export function updatePlayer<Player extends TagMember>(
  players: readonly Player[],
  playerId: string,
  change: (player: Player) => Player,
): Player[] {
  return players.map((player) => (player.playerId === playerId ? change(player) : player));
}

/** What a round player keeps once the round is over: their score and their input count. */
export function toMember(player: RoundPlayer): TagMember {
  return {
    playerId: player.playerId,
    scoreMs: player.scoreMs,
    lastProcessedSeq: player.lastProcessedSeq,
  };
}

export function isOver(state: CursorTagState): boolean {
  return state.phase === "over";
}
