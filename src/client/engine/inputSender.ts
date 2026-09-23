import { INPUT_SEND_RATE } from "../../shared/constants";
import type { CursorInput } from "../../shared/cursor/cursorInput";
import { createInputAccumulator } from "./inputAccumulator";
import { createInputLedger, type SentInput } from "./inputLedger";

export interface InputSenderDeps {
  send: (input: CursorInput) => void;
  /** Passed in so that a test can drive the rhythm instead of waiting for it. */
  intervalMs?: number;
  /** The clock the send times are read on; the view store's, unless a test drives it. */
  now?: () => number;
}

export interface InputSender {
  /** One `mousemove` while the pointer is locked, in CSS pixels. */
  add: (movementX: number, movementY: number, scale: number) => void;
  start: () => void;
  stop: () => void;
  /**
   * Forgets the count and everything waiting. `seq` restarts at 0 at the start of a game and on
   * every reconnection, and the server sets its own counter back to −1 at the same moments
   * (docs/architecture.md, §6.5). Losing the pointer lock is **not** one of them: the server's
   * counter does not move then, so restarting would have it reject every input until the old
   * count was caught up again.
   */
  restart: () => void;
  /**
   * Drops what the server says it has applied, so the prediction replays only the rest, and
   * learns from the view's arrival how long acknowledgements take.
   */
  acknowledge: (lastProcessedSeq: number, receivedAt: number) => void;
  /** Inputs sent and not yet applied by the server, with the moment each left. */
  pending: () => readonly SentInput[];
  /** The shortest time a view has taken lately to acknowledge an input, or `null` before any. */
  ackDelayMs: () => number | null;
  /** What is gathered and not sent yet, which the prediction replays last. */
  pendingDelta: () => { dx: number; dy: number };
}

/**
 * Sends the cursor's movement `INPUT_SEND_RATE` times a second, and only when it moved: a still
 * mouse costs nothing (docs/architecture.md, §6.5).
 */
export function createInputSender({ send, intervalMs, now }: InputSenderDeps): InputSender {
  const accumulator = createInputAccumulator();
  const ledger = createInputLedger();
  const period = intervalMs ?? 1000 / INPUT_SEND_RATE;
  const clock = now ?? Date.now;

  let nextSeq = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function flush(): void {
    const { dx, dy } = accumulator.take();
    if (dx === 0 && dy === 0) {
      return;
    }

    const input: CursorInput = { seq: nextSeq, dx, dy };
    nextSeq += 1;
    ledger.record(input, clock());
    send(input);
  }

  return {
    add: (movementX, movementY, scale) => accumulator.add(movementX, movementY, scale),

    start: () => {
      if (timer === null) {
        timer = setInterval(flush, period);
      }
    },

    stop: () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },

    restart: () => {
      nextSeq = 0;
      ledger.clear();
      accumulator.clear();
    },

    acknowledge: (lastProcessedSeq, receivedAt) => ledger.acknowledge(lastProcessedSeq, receivedAt),
    pending: () => ledger.pending(),
    ackDelayMs: () => ledger.ackDelayMs(),
    pendingDelta: () => accumulator.peek(),
  };
}
