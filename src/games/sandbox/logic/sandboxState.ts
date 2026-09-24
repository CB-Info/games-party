import { moveWithBacklog } from "../../../shared/cursor/backlog";
import type { Point, Wall } from "../../../shared/cursor/collision";
import { distance } from "../../../shared/cursor/collision";
import { NO_SEQ_PROCESSED, type CursorInput } from "../../../shared/cursor/cursorInput";
import { rechargeBudget } from "../../../shared/cursor/moveCursor";
import { shuffle } from "../../../shared/shuffle";
import { SANDBOX_CURSOR_RADIUS } from "../shared/constants";

/** A cursor of the sandbox, with everything the game keeps about it. */
export interface SandboxPlayer {
  playerId: string;
  position: Point;
  budget: number;
  lastProcessedSeq: number;
  /** Movement the budget could not pay yet, kept while « Rattrapage » is on (§6). */
  backlog: Point;
  /** Logical units travelled since the start: the score of this game. */
  distance: number;
}

const NOTHING: Point = { x: 0, y: 0 };

/**
 * Hands out spawn points, shuffled so that two games do not start the same way. Uses the injected
 * randomness, never `Math.random` (CLAUDE.md, règle d'or 7).
 */
export function spawnPlayers(
  playerIds: readonly string[],
  spawnPoints: readonly Point[],
  random: () => number,
): SandboxPlayer[] {
  const points = shuffle(spawnPoints, random);

  return playerIds.map((playerId, index) => ({
    playerId,
    // More players than spawn points would be a bug, but wrapping round beats crashing.
    position: points[index % points.length] ?? { x: 0, y: 0 },
    budget: 0,
    lastProcessedSeq: NO_SEQ_PROCESSED,
    backlog: NOTHING,
    distance: 0,
  }));
}

/** What a move depends on besides the player: the map and the two settings the host chose. */
export interface MoveSettings {
  walls: readonly Wall[];
  /** Set by the host in the lobby, so that several speeds can be tried against a real mouse. */
  maxSpeed: number;
  /** How long a cursor may keep catching up after the hand stops; zero keeps nothing. */
  catchUpMs: number;
}

/** A move of one player, who may be away. */
export interface MoveContext extends MoveSettings {
  connected: boolean;
}

/**
 * Applies one input and records its sequence number. Whether the input is new is decided by the
 * caller, which is the only one that knows a bot from a human (`isNewInput`, §6.5). An input from
 * a player who is away is recorded without moving anything, so that their sequence never falls
 * behind while they are gone.
 */
export function applyInput(
  player: SandboxPlayer,
  input: CursorInput,
  context: MoveContext,
): SandboxPlayer {
  const seen = { ...player, lastProcessedSeq: input.seq };
  if (!context.connected) {
    return seen;
  }

  return movePlayer(seen, { x: input.dx, y: input.dy }, context);
}

/**
 * Pays what every present player still owes, from what their budget has left (§6). It comes
 * **before** the recharge in the tick, never after: paid from a fresh recharge on top of a full
 * reserve, a cursor that stood still would jump half as far again as it can today in its first
 * tick of movement — a bound of the security table (docs/architecture.md, §9) and the very jump
 * that shortening the reserve removed.
 */
export function payBacklogs(
  players: readonly SandboxPlayer[],
  settings: MoveSettings,
  isConnected: (playerId: string) => boolean,
): SandboxPlayer[] {
  return players.map((player) => {
    const owes = player.backlog.x !== 0 || player.backlog.y !== 0;
    return owes && isConnected(player.playerId) ? movePlayer(player, NOTHING, settings) : player;
  });
}

/** One move of one cursor, remainder included, with the distance it really travelled. */
function movePlayer(player: SandboxPlayer, delta: Point, settings: MoveSettings): SandboxPlayer {
  const moved = moveWithBacklog({
    position: player.position,
    delta,
    backlog: player.backlog,
    budget: player.budget,
    maxSpeed: settings.maxSpeed,
    radius: SANDBOX_CURSOR_RADIUS,
    walls: settings.walls,
    catchUpMs: settings.catchUpMs,
  });

  return {
    ...player,
    position: moved.position,
    budget: moved.budget,
    backlog: moved.backlog,
    distance: player.distance + distance(player.position, moved.position),
  };
}

/** Refills every budget for the inputs of the next tick (docs/architecture.md, §6.5). */
export function rechargePlayers(
  players: readonly SandboxPlayer[],
  dtMs: number,
  maxSpeed: number,
): SandboxPlayer[] {
  return players.map((player) => ({
    ...player,
    budget: rechargeBudget(player.budget, maxSpeed, dtMs),
  }));
}

/** Positions travel thirty times a second: one decimal is invisible and halves the payload. */
export function roundPosition(value: number): number {
  return Math.round(value * 10) / 10;
}
