import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CursorInput } from "../../shared/cursor/cursorInput";
import { createInputSender } from "./inputSender";

const PERIOD_MS = 1000 / 30;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function senderOver() {
  const sent: CursorInput[] = [];
  const sender = createInputSender({ send: (input) => sent.push(input), intervalMs: PERIOD_MS });
  sender.start();

  return { sent, sender };
}

describe("createInputSender rhythm", () => {
  it("sends once per period, whatever happened in between", () => {
    const { sent, sender } = senderOver();

    sender.add(3, 0, 1);
    sender.add(4, 0, 1);
    vi.advanceTimersByTime(PERIOD_MS);

    expect(sent).toEqual([{ seq: 0, dx: 7, dy: 0 }]);
  });

  it("says nothing when the mouse did not move", () => {
    const { sent } = senderOver();

    vi.advanceTimersByTime(PERIOD_MS * 10);

    // A still mouse costs nothing: thirty empty messages a second would be pure waste (§6.5).
    expect(sent).toEqual([]);
  });

  it("numbers its messages one by one", () => {
    const { sent, sender } = senderOver();

    for (let index = 0; index < 3; index += 1) {
      sender.add(1, 0, 1);
      vi.advanceTimersByTime(PERIOD_MS);
    }

    expect(sent.map((input) => input.seq)).toEqual([0, 1, 2]);
  });

  it("stops sending once stopped", () => {
    const { sent, sender } = senderOver();

    sender.stop();
    sender.add(5, 0, 1);
    vi.advanceTimersByTime(PERIOD_MS * 5);

    expect(sent).toEqual([]);
  });
});

describe("createInputSender and the prediction", () => {
  it("keeps what the server has not applied yet", () => {
    const { sender } = senderOver();

    for (let index = 0; index < 3; index += 1) {
      sender.add(1, 0, 1);
      vi.advanceTimersByTime(PERIOD_MS);
    }

    expect(sender.pending().map((input) => input.seq)).toEqual([0, 1, 2]);
  });

  it("forgets what the server says it has applied", () => {
    const { sender } = senderOver();
    for (let index = 0; index < 3; index += 1) {
      sender.add(1, 0, 1);
      vi.advanceTimersByTime(PERIOD_MS);
    }

    sender.acknowledge(1, Date.now());

    // Everything up to and including the acknowledged number is gone; the rest still replays.
    expect(sender.pending().map((input) => input.seq)).toEqual([2]);
  });

  it("notes when each input left, and learns how long acknowledgements take", () => {
    // The fake timers drive `Date.now` too, which is the clock the view store reads.
    const { sender } = senderOver();
    const startedAt = Date.now();
    sender.add(1, 0, 1);
    vi.advanceTimersByTime(PERIOD_MS);

    const [sent] = sender.pending();
    expect(sent?.sentAt).toBeCloseTo(startedAt + PERIOD_MS, 0);
    expect(sender.ackDelayMs()).toBeNull();

    sender.acknowledge(0, (sent?.sentAt ?? 0) + 45);
    expect(sender.ackDelayMs()).toBe(45);
  });

  it("shows the movement gathered since the last send", () => {
    const { sender } = senderOver();

    sender.add(6, 8, 1);

    expect(sender.pendingDelta()).toEqual({ dx: 6, dy: 8 });
    vi.advanceTimersByTime(PERIOD_MS);
    expect(sender.pendingDelta()).toEqual({ dx: 0, dy: 0 });
  });
});

describe("createInputSender restarts", () => {
  it("counts from zero again at the start of a game and on a reconnection", () => {
    const { sent, sender } = senderOver();
    for (let index = 0; index < 3; index += 1) {
      sender.add(1, 0, 1);
      vi.advanceTimersByTime(PERIOD_MS);
    }

    // Both moments reset the server's own counter to −1 (§6.5), so the client counts from 0 too.
    sender.restart();
    sender.add(1, 0, 1);
    vi.advanceTimersByTime(PERIOD_MS);

    expect(sent.map((input) => input.seq)).toEqual([0, 1, 2, 0]);
    expect(sender.pending().map((input) => input.seq)).toEqual([0]);
  });

  it("drops everything waiting when it restarts", () => {
    const { sender } = senderOver();
    sender.add(1, 0, 1);
    vi.advanceTimersByTime(PERIOD_MS);
    sender.add(9, 9, 1);

    sender.restart();

    expect(sender.pending()).toEqual([]);
    expect(sender.pendingDelta()).toEqual({ dx: 0, dy: 0 });
  });

  it("keeps counting when nothing restarts it, which losing the pointer lock does not", () => {
    const { sent, sender } = senderOver();
    sender.add(1, 0, 1);
    vi.advanceTimersByTime(PERIOD_MS);

    // Escape only stops the sending; restarting here would have the server reject every input
    // until the old count was caught up again (§6.5).
    sender.stop();
    sender.start();
    sender.add(1, 0, 1);
    vi.advanceTimersByTime(PERIOD_MS);

    expect(sent.map((input) => input.seq)).toEqual([0, 1]);
  });
});
