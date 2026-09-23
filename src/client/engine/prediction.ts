import { SERVER_TICK_RATE } from "../../shared/constants";
import { moveWithBacklog } from "../../shared/cursor/backlog";
import type { Point, Wall } from "../../shared/cursor/collision";
import { budgetCap } from "../../shared/cursor/moveCursor";
import type { SentInput } from "./inputLedger";

/** One server tick, in milliseconds. */
const TICK_MS = 1000 / SERVER_TICK_RATE;

/**
 * How much later than the shortest delay an acknowledgement may come before its input is taken for
 * held on the way: one tick for the wait an input can meet before the server's step, and as much
 * again for the network's unevenness.
 */
const HELD_MARGIN_MS = 2 * TICK_MS;

const NOTHING: Point = { x: 0, y: 0 };

export interface PredictionInput {
  /** Where the server says the cursor is, from the last view received. */
  officialPosition: Point;
  /**
   * The budget the server says is left, from the same view. It comes from the view and not from a
   * local count: the server has authority over it as it does over the position (règle d'or 1), and
   * a budget kept locally would drift the first time an input was dropped.
   */
  officialBudget: number;
  /**
   * The movement the server says is still owed, from the same view, for the same reason as the
   * budget. Always zero unless the game keeps what the budget refuses (« Rattrapage »).
   */
  officialBacklog: Point;
  /** Inputs sent since that view and not yet applied by the server, with the moment each left. */
  pendingInputs: readonly SentInput[];
  /** What the player is about to send, gathered since the last send. */
  pendingDelta: Point;
  /** When the view was received, and the present, on the clock the send times are read on. */
  viewReceivedAt: number;
  now: number;
  /** The shortest time a view has lately taken to acknowledge an input, or `null` before any. */
  ackDelayMs: number | null;
  maxSpeed: number;
  /** How long the cursor may keep catching up, as the game set it; zero keeps nothing. */
  catchUpMs: number;
  radius: number;
  walls: readonly Wall[];
}

export interface PredictionResult {
  position: Point;
  budget: number;
  /** What is still owed after the replay: the cursor goes on gliding until it is paid. */
  backlog: Point;
  /**
   * Movement the budget refused and nothing kept, in logical units. It is lost for good: the server
   * does the same, so this is exactly what a player asked for and will not get. A number that stays
   * above zero means the cursor is capped rather than followed.
   */
  truncated: number;
}

/**
 * Where the local cursor really is, as far as this browser can tell (docs/architecture.md, §6.5).
 * It replays what the server has not applied yet on top of what it last said, with
 * `moveWithBacklog` — the same function the server runs, and `moveCursor` exactly while the game
 * keeps nothing.
 *
 * The replay follows the rhythm the inputs were **sent** at, because that is the rhythm they reach
 * the server at: each input is given the budget the server will have refilled since the one before
 * it. Recharging once for all the time since the view, as the engine first did, stalls the cursor
 * as soon as views stop coming — the server went on moving it, the prediction did not — and the
 * view that finally lands then jumps it forward.
 *
 * There is one exception, and it is the other way round: inputs a view should already have
 * acknowledged, and did not, are held on the way to the server. The network delivers everything
 * behind them in one burst, which the server pays from a single tick's budget: the replay lands
 * them together, and holds back what is gathered with them.
 */
export function predictCursor(input: PredictionInput): PredictionResult {
  const cap = budgetCap(input.maxSpeed);
  // The view's own tick, on the clock of the sends: an input sent then would just have made it in.
  // Until an acknowledgement has told how long that takes, one tick is assumed.
  const viewTick = input.viewReceivedAt - (input.ackDelayMs ?? TICK_MS);
  const held =
    input.ackDelayMs === null
      ? -1
      : input.pendingInputs.findIndex((pending) => pending.sentAt <= viewTick - HELD_MARGIN_MS);

  let position = input.officialPosition;
  let backlog = input.officialBacklog;
  // The view carries the budget the server will spend at its next tick; at the view's own tick, it
  // had one recharge less. Counted from there, what each input finds is what the server will give.
  let budget = input.officialBudget - (input.maxSpeed * TICK_MS) / 1000;
  let truncated = 0;

  function move(delta: Point): void {
    const moved = moveWithBacklog({
      position,
      delta,
      backlog,
      budget,
      maxSpeed: input.maxSpeed,
      radius: input.radius,
      walls: input.walls,
      catchUpMs: input.catchUpMs,
    });

    position = moved.position;
    budget = moved.budget;
    backlog = moved.backlog;
    truncated += moved.dropped;
  }

  /** The server's ticks over that time: refill, pay what is owed, and never hold more than the cap. */
  function elapse(ms: number): void {
    budget += (input.maxSpeed * Math.max(0, ms)) / 1000;
    if (backlog.x !== 0 || backlog.y !== 0) {
      move(NOTHING);
    }
    budget = Math.min(budget, cap);
  }

  input.pendingInputs.forEach((pending, index) => {
    const previous = index === 0 ? viewTick : (input.pendingInputs[index - 1]?.sentAt ?? viewTick);
    elapse(held !== -1 && index > held ? 0 : pending.sentAt - previous);
    move({ x: pending.dx, y: pending.dy });
  });

  const last = input.pendingInputs.at(-1);
  elapse(held !== -1 ? 0 : input.now - (last?.sentAt ?? viewTick));
  move(input.pendingDelta);

  return { position, budget, backlog, truncated };
}
