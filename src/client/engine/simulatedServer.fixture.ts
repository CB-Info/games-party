import { ARENA_HEIGHT, ARENA_WIDTH } from "../../shared/constants";
import { moveWithBacklog, type BacklogMoveResult } from "../../shared/cursor/backlog";
import { distance, type Point, type Wall } from "../../shared/cursor/collision";
import { NO_SEQ_PROCESSED, type CursorInput } from "../../shared/cursor/cursorInput";
import { rechargeBudget } from "../../shared/cursor/moveCursor";

const NOTHING: Point = { x: 0, y: 0 };

/** What the server holds for one cursor, and nothing more (docs/architecture.md, §6.3). */
export interface ServerState {
  position: Point;
  budget: number;
  /** Movement owed and not paid yet: always zero unless the run keeps what the budget refuses. */
  backlog: Point;
  lastProcessedSeq: number;
}

/** The values a view carries for the player it is sent to (§6.5). */
export interface View {
  position: Point;
  budget: number;
  backlog: Point;
  seq: number;
}

/** One input on its way to the server, with the moment it lands. */
export interface Travelling {
  input: CursorInput;
  arrivesAt: number;
}

/** What the run adds up as it goes, so the caller can report it. */
export interface ServerTotals {
  travelled: number;
  truncatedUnits: number;
  truncatedSends: number;
}

export interface StepSetup {
  maxSpeed: number;
  radius: number;
  /** « Rattrapage » of the sandbox; zero, the engine everywhere else, keeps nothing. */
  catchUpMs?: number;
}

export function createServerState(): ServerState {
  return {
    position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
    budget: 0,
    backlog: NOTHING,
    lastProcessedSeq: NO_SEQ_PROCESSED,
  };
}

/**
 * One server tick, in the order of the real loop (docs/architecture.md, §6.3 and §6.5): everything
 * that arrived since the last tick, then what is still owed, then the recharge. The recharge comes
 * **last** — before the inputs it would hand each of them a tick's worth of budget it has not
 * earned, and before the remainder it would let a cursor move further in one tick than it can.
 */
export function serverTick(
  server: ServerState,
  travelling: Travelling[],
  now: number,
  tickMs: number,
  setup: StepSetup,
  walls: readonly Wall[],
  totals: ServerTotals,
): View {
  applyArrivedInputs(server, travelling, now, setup, walls, totals);
  record(server, step(server, NOTHING, setup, walls), totals);
  server.budget = rechargeBudget(server.budget, setup.maxSpeed, tickMs);

  return {
    position: server.position,
    budget: server.budget,
    backlog: server.backlog,
    seq: server.lastProcessedSeq,
  };
}

function applyArrivedInputs(
  server: ServerState,
  travelling: Travelling[],
  now: number,
  setup: StepSetup,
  walls: readonly Wall[],
  totals: ServerTotals,
): void {
  while (travelling.length > 0 && (travelling[0]?.arrivesAt ?? Infinity) <= now) {
    const arrived = travelling.shift();
    if (arrived === undefined || arrived.input.seq <= server.lastProcessedSeq) {
      continue;
    }

    const moved = step(server, { x: arrived.input.dx, y: arrived.input.dy }, setup, walls);
    if (moved.dropped > 0) {
      totals.truncatedSends += 1;
    }

    record(server, moved, totals);
    server.lastProcessedSeq = arrived.input.seq;
  }
}

function step(
  server: ServerState,
  delta: Point,
  setup: StepSetup,
  walls: readonly Wall[],
): BacklogMoveResult {
  return moveWithBacklog({
    position: server.position,
    delta,
    backlog: server.backlog,
    budget: server.budget,
    maxSpeed: setup.maxSpeed,
    radius: setup.radius,
    walls,
    catchUpMs: setup.catchUpMs ?? 0,
  });
}

function record(server: ServerState, moved: BacklogMoveResult, totals: ServerTotals): void {
  totals.travelled += distance(server.position, moved.position);
  totals.truncatedUnits += moved.dropped;
  server.position = moved.position;
  server.budget = moved.budget;
  server.backlog = moved.backlog;
}
