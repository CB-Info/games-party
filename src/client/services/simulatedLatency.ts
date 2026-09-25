import { SIMULATED_HOLE_EVERY_MS } from "../../shared/constants";
import { readHoleMs, readLagMs } from "../utils/lagParameter";
import { holeEndAt } from "../utils/simulatedHoles";

/**
 * Development latency simulator (docs/architecture.md, §8.1). `?lag=200` delays everything the
 * client sends and everything it receives by 200 ms, so that prediction and interpolation can be
 * watched behaving as they would on a real network — one tab slowed down, another beside it at
 * full speed. `?holeIn=250` and `?holeOut=250` open a hole of 250 ms every few seconds in one
 * direction: nothing gets through, then everything held back does at once, as after a lost packet
 * — one message per task, in order (`releaseInOrder`).
 *
 * Read **once**, when this module is first loaded, so that navigating from the home screen to a
 * room keeps them. `import.meta.env.DEV` becomes the literal `false` at build time, so the whole
 * thing leaves the production bundle.
 */
const lagMs = import.meta.env.DEV ? readLagMs(window.location.search) : 0;
const holeMs = {
  in: import.meta.env.DEV ? readHoleMs(window.location.search, "holeIn") : 0,
  out: import.meta.env.DEV ? readHoleMs(window.location.search, "holeOut") : 0,
};

/** What is held back by the current hole in each direction, in the order it came. */
const held: Record<"in" | "out", Array<() => void>> = { in: [], out: [] };

export function simulatedLagMs(): number {
  return lagMs;
}

/** Runs `act` after the simulated delay, or straight away when there is none. */
export function afterSimulatedLag(act: () => void): void {
  if (lagMs === 0) {
    act();
    return;
  }

  setTimeout(act, lagMs);
}

/**
 * Runs `act` now, or when the hole open in that direction closes. Whatever comes while messages
 * are held joins the queue behind them, hole or not, so that nothing overtakes what was held.
 */
export function throughSimulatedHole(way: "in" | "out", act: () => void): void {
  if (!import.meta.env.DEV || holeMs[way] === 0) {
    act();
    return;
  }

  const queue = held[way];
  const now = performance.now();
  const endsAt = holeEndAt(now, holeMs[way], SIMULATED_HOLE_EVERY_MS);
  if (endsAt === null && queue.length === 0) {
    act();
    return;
  }

  queue.push(act);
  if (queue.length === 1) {
    setTimeout(() => releaseInOrder(queue), (endsAt ?? now) - now);
  }
}

/**
 * Lets what was held go, one message per task and in the order it came. Released in a single pass,
 * the inputs would all but one be dropped: Socket.IO throws a volatile message away while the one
 * before it still occupies the connection (docs/architecture.md, §6.2), and the hole would then
 * simulate a loss rather than the burst TCP delivers after one.
 */
function releaseInOrder(queue: Array<() => void>): void {
  queue.shift()?.();
  if (queue.length > 0) {
    setTimeout(() => releaseInOrder(queue), 0);
  }
}
