import type { CursorInput } from "../../shared/cursor/cursorInput";

/**
 * How many acknowledgements the delay is read over: about two seconds of inputs, long enough to
 * ride out a burst after a hole, short enough to follow a connection that got slower.
 */
const DELAY_SAMPLES = 60;

/** An input sent and not acknowledged yet, with the moment it left, on the client's clock. */
export interface SentInput extends CursorInput {
  sentAt: number;
}

export interface InputLedger {
  record: (input: CursorInput, sentAt: number) => void;
  /** Drops what a view says the server applied, and learns how long that took. */
  acknowledge: (lastProcessedSeq: number, receivedAt: number) => void;
  /** Inputs sent and not yet applied by the server, oldest first. */
  pending: () => readonly SentInput[];
  /**
   * The shortest time a view has taken lately to acknowledge an input, in milliseconds, or `null`
   * before any has. The shortest rather than the mean: it is the delay of an input that met no
   * wait at all, which is what an input held on the way is measured against.
   */
  ackDelayMs: () => number | null;
  clear: () => void;
}

/**
 * What the client sent and the server has not confirmed yet (docs/architecture.md, §6.5). The
 * prediction replays it; the moments it left, and the time acknowledgements take, are what tell
 * an input on its way from one held back by the network.
 */
export function createInputLedger(): InputLedger {
  let pending: SentInput[] = [];
  let delays: number[] = [];

  return {
    record(input: CursorInput, sentAt: number): void {
      pending.push({ ...input, sentAt });
    },

    acknowledge(lastProcessedSeq: number, receivedAt: number): void {
      const applied = pending.filter((input) => input.seq <= lastProcessedSeq);
      if (applied.length === 0) {
        return;
      }

      delays = [...delays, ...applied.map((input) => receivedAt - input.sentAt)].slice(
        -DELAY_SAMPLES,
      );
      pending = pending.filter((input) => input.seq > lastProcessedSeq);
    },

    pending: () => pending,

    ackDelayMs: () => (delays.length === 0 ? null : Math.min(...delays)),

    clear(): void {
      pending = [];
      delays = [];
    },
  };
}
