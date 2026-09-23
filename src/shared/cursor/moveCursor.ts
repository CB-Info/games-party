import { MOVE_BUDGET_CAP_MS, MOVE_SUBSTEP } from "../constants";
import { isOutsideArena, overlapsAnyWall, type Point, type Wall } from "./collision";

export interface MoveCursorInput {
  /** Where the cursor is before the move. */
  position: Point;
  /** Movement the player asked for, in logical units. */
  delta: Point;
  /** Distance the cursor may still travel, in logical units. */
  budget: number;
  /** Top speed of this cursor, in logical units per second, decided by the game. */
  maxSpeed: number;
  /** Radius of the cursor disc, decided by the game. */
  radius: number;
  walls: readonly Wall[];
}

export interface MoveCursorResult {
  position: Point;
  budget: number;
}

/**
 * Applies one input to a cursor. Pure, and used unchanged by the server and by the client's
 * prediction (docs/architecture.md, §6.5): the same input from the same state must give the same
 * result on both sides, or the local cursor would drift away from the official one.
 */
export function moveCursor(input: MoveCursorInput): MoveCursorResult {
  const length = Math.hypot(input.delta.x, input.delta.y);
  if (length === 0 || input.budget <= 0) {
    return { position: input.position, budget: input.budget };
  }

  // The move is shortened to what the budget allows, keeping its direction (§6.5).
  const allowed = Math.min(length, input.budget);
  const ratio = allowed / length;
  const delta = { x: input.delta.x * ratio, y: input.delta.y * ratio };

  return {
    position: slideAlongWalls(input.position, delta, input.radius, input.walls),
    budget: input.budget - allowed,
  };
}

/**
 * Refills the budget, once per server tick and at the same pace on the client. The cap is what
 * stops a cursor that stood still from crossing the arena in one input (§6.5).
 */
export function rechargeBudget(budget: number, maxSpeed: number, dtMs: number): number {
  return Math.min(budget + (maxSpeed * dtMs) / 1000, budgetCap(maxSpeed));
}

/** The most a cursor can have in hand at once: `MOVE_BUDGET_CAP_MS` of travel at top speed. */
export function budgetCap(maxSpeed: number): number {
  return (maxSpeed * MOVE_BUDGET_CAP_MS) / 1000;
}

/**
 * Walks the move in steps of at most `MOVE_SUBSTEP`, applying X then Y separately. Cancelling only
 * the component that hits something is what makes a cursor slide along a wall instead of sticking
 * to it; cutting the move into steps is what stops it from jumping through a thin wall (§6.5).
 */
function slideAlongWalls(
  start: Point,
  delta: Point,
  radius: number,
  walls: readonly Wall[],
): Point {
  const length = Math.hypot(delta.x, delta.y);
  const steps = Math.max(1, Math.ceil(length / MOVE_SUBSTEP));
  const step = { x: delta.x / steps, y: delta.y / steps };

  let position = start;

  for (let index = 0; index < steps; index += 1) {
    position = tryAxis(position, { x: step.x, y: 0 }, radius, walls);
    position = tryAxis(position, { x: 0, y: step.y }, radius, walls);
  }

  return position;
}

/** Moves along one axis, and stays put when the disc would end up inside a wall or outside. */
function tryAxis(position: Point, step: Point, radius: number, walls: readonly Wall[]): Point {
  if (step.x === 0 && step.y === 0) {
    return position;
  }

  const candidate = { x: position.x + step.x, y: position.y + step.y };
  const blocked = isOutsideArena(candidate, radius) || overlapsAnyWall(candidate, radius, walls);

  return blocked ? position : candidate;
}
