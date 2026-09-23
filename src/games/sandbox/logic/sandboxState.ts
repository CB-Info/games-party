import type { Point, Wall } from "../../../shared/cursor/collision";
import { distance } from "../../../shared/cursor/collision";
import { NO_SEQ_PROCESSED, type CursorInput } from "../../../shared/cursor/cursorInput";
import { moveCursor, rechargeBudget } from "../../../shared/cursor/moveCursor";
import { SANDBOX_CURSOR_RADIUS } from "../shared/constants";

/** A cursor of the sandbox, with everything the game keeps about it. */
export interface SandboxPlayer {
  playerId: string;
  position: Point;
  budget: number;
  lastProcessedSeq: number;
  /** Logical units travelled since the start: the score of this game. */
  distance: number;
}

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
    distance: 0,
  }));
}

/** What a move depends on besides the player: the map and the speed the host chose. */
export interface MoveSettings {
  walls: readonly Wall[];
  /** Set by the host in the lobby, so that several speeds can be tried against a real mouse. */
  maxSpeed: number;
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

  const moved = moveCursor({
    position: player.position,
    delta: { x: input.dx, y: input.dy },
    budget: player.budget,
    maxSpeed: context.maxSpeed,
    radius: SANDBOX_CURSOR_RADIUS,
    walls: context.walls,
  });

  return {
    ...seen,
    position: moved.position,
    budget: moved.budget,
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

function shuffle(points: readonly Point[], random: () => number): Point[] {
  const shuffled = [...points];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = shuffled[index] as Point;
    shuffled[index] = shuffled[other] as Point;
    shuffled[other] = held;
  }

  return shuffled;
}
