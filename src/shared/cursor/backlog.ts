import type { Point } from "./collision";
import { moveCursor, type MoveCursorInput, type MoveCursorResult } from "./moveCursor";

/** Below this, in logical units, a difference is rounding and not something a wall stopped. */
const BLOCKED_EPSILON = 1e-6;

const NOTHING: Point = { x: 0, y: 0 };

export interface BacklogMoveInput extends MoveCursorInput {
  /** Movement owed by earlier moves, which the budget could not pay yet: the « reste ». */
  backlog: Point;
  /**
   * How long the cursor may keep catching up once the hand has stopped, in milliseconds of travel
   * at top speed — the sandbox's « Rattrapage ». Zero keeps nothing, and the move is then exactly
   * what `moveCursor` gives.
   */
  catchUpMs: number;
}

export interface BacklogMoveResult extends MoveCursorResult {
  backlog: Point;
  /** Movement the budget refused and nothing kept, lost for good, in logical units. */
  dropped: number;
}

/**
 * A move that does not throw away what the budget refuses (docs/architecture.md, §6.5, sandbox
 * only for now). The remainder of earlier moves and the new movement are paid together with the
 * budget; what the budget cannot pay is kept, up to a leash, and paid by the moves that follow.
 * Pure and shared, like `moveCursor`: the server and the client's prediction run it unchanged.
 *
 * It grants no speed. The remainder is movement owed, not budget, and it is paid from the same
 * budget as everything else — so the cursor never travels further in a tick than it can today.
 */
export function moveWithBacklog(input: BacklogMoveInput): BacklogMoveResult {
  const asked = { x: input.backlog.x + input.delta.x, y: input.backlog.y + input.delta.y };
  const length = Math.hypot(asked.x, asked.y);
  if (length === 0) {
    return { position: input.position, budget: input.budget, backlog: NOTHING, dropped: 0 };
  }

  const moved = moveCursor({
    position: input.position,
    delta: asked,
    budget: input.budget,
    maxSpeed: input.maxSpeed,
    radius: input.radius,
    walls: input.walls,
  });

  // The share of the move the budget pays, by the rule `moveCursor` applies (§6.5: the allowed
  // distance is the smaller of the move and the budget). Read from the rule rather than from the
  // budget it spent, which rounding leaves a hair short: a move the budget covers must refuse
  // exactly nothing, or every such move would count as cut.
  const paidShare = input.budget <= 0 ? 0 : Math.min(length, input.budget) / length;
  const allowed = { x: asked.x * paidShare, y: asked.y * paidShare };
  const refused = { x: asked.x - allowed.x, y: asked.y - allowed.y };

  // A wall or an edge that stopped part of an axis takes that axis of the remainder with it, so the
  // remainder slides along the wall as the cursor does. Kept whole, it would push into the wall and
  // burn the budget on nothing: the cursor would stick to it until the remainder ran out.
  const travelled = {
    x: moved.position.x - input.position.x,
    y: moved.position.y - input.position.y,
  };
  const free = {
    x: Math.abs(allowed.x - travelled.x) <= BLOCKED_EPSILON ? refused.x : 0,
    y: Math.abs(allowed.y - travelled.y) <= BLOCKED_EPSILON ? refused.y : 0,
  };

  const kept = withinLeash(free, (input.maxSpeed * input.catchUpMs) / 1000);

  return {
    position: moved.position,
    budget: moved.budget,
    backlog: kept,
    dropped: Math.hypot(refused.x, refused.y) - Math.hypot(kept.x, kept.y),
  };
}

/**
 * Shortens the remainder to the leash, keeping its direction. Without a leash, a client could
 * queue up a long straight line that would play out after it stopped sending anything.
 */
function withinLeash(remainder: Point, leash: number): Point {
  const length = Math.hypot(remainder.x, remainder.y);
  if (length <= leash) {
    return remainder;
  }

  if (leash <= 0) {
    return NOTHING;
  }

  return { x: (remainder.x * leash) / length, y: (remainder.y * leash) / length };
}
