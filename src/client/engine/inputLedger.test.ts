import { describe, expect, it } from "vitest";

import { createInputLedger } from "./inputLedger";

function input(seq: number) {
  return { seq, dx: 10, dy: 0 };
}

describe("createInputLedger", () => {
  it("keeps what was sent, with the moment it left, oldest first", () => {
    const ledger = createInputLedger();
    ledger.record(input(0), 1000);
    ledger.record(input(1), 1033);

    expect(ledger.pending()).toEqual([
      { seq: 0, dx: 10, dy: 0, sentAt: 1000 },
      { seq: 1, dx: 10, dy: 0, sentAt: 1033 },
    ]);
  });

  it("drops what a view says the server applied", () => {
    const ledger = createInputLedger();
    ledger.record(input(0), 1000);
    ledger.record(input(1), 1033);

    ledger.acknowledge(0, 1050);

    expect(ledger.pending().map((sent) => sent.seq)).toEqual([1]);
  });

  it("knows no delay before the first acknowledgement", () => {
    const ledger = createInputLedger();
    ledger.record(input(0), 1000);

    expect(ledger.ackDelayMs()).toBeNull();
  });

  it("keeps the shortest delay, the one of an input that met no wait", () => {
    const ledger = createInputLedger();
    ledger.record(input(0), 1000);
    ledger.record(input(1), 1033);
    ledger.record(input(2), 1066);

    ledger.acknowledge(0, 1070);
    ledger.acknowledge(2, 1150);

    // 70, then 117 and 84: the shortest is the connection's own delay.
    expect(ledger.ackDelayMs()).toBe(70);
  });

  it("learns nothing from a view that acknowledges nothing new", () => {
    const ledger = createInputLedger();
    ledger.record(input(0), 1000);
    ledger.acknowledge(0, 1040);

    // The same view, read again at the next frame: the delay stays the one it gave.
    ledger.acknowledge(0, 1090);

    expect(ledger.ackDelayMs()).toBe(40);
  });

  it("forgets old delays, so that a connection that got slower is followed", () => {
    const ledger = createInputLedger();
    ledger.record(input(0), 0);
    ledger.acknowledge(0, 20);

    for (let seq = 1; seq <= 60; seq += 1) {
      ledger.record(input(seq), seq * 100);
      ledger.acknowledge(seq, seq * 100 + 90);
    }

    expect(ledger.ackDelayMs()).toBe(90);
  });

  it("forgets everything when cleared", () => {
    const ledger = createInputLedger();
    ledger.record(input(0), 1000);
    ledger.acknowledge(0, 1040);
    ledger.record(input(1), 1100);

    ledger.clear();

    expect(ledger.pending()).toEqual([]);
    expect(ledger.ackDelayMs()).toBeNull();
  });
});
