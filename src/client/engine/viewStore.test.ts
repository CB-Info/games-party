import { describe, expect, it } from "vitest";

import { INTERPOLATION_BUFFER_MS } from "../../shared/constants";
import { createViewStore } from "./viewStore";

/** A view whose content is just its own server time, so a test can tell them apart. */
function payload(serverTime: number, tick = serverTime) {
  return { tick, serverTime, view: { at: serverTime } };
}

describe("createViewStore", () => {
  it("has nothing before the first view", () => {
    const store = createViewStore();

    expect(store.latest()).toBeNull();
    expect(store.sampleAt(1000)).toBeNull();
  });

  it("keeps the last view received", () => {
    const store = createViewStore();

    store.push(payload(1000), 5000);
    store.push(payload(1033), 5033);

    expect(store.latest()?.serverTime).toBe(1033);
    expect(store.latest()?.receivedAt).toBe(5033);
  });

  it("frames a moment between two views", () => {
    const store = createViewStore();
    store.push(payload(1000), 5000);
    store.push(payload(1100), 5100);

    const bracket = store.sampleAt(1025);

    expect(bracket?.from.serverTime).toBe(1000);
    expect(bracket?.to?.serverTime).toBe(1100);
    expect(bracket?.t).toBeCloseTo(0.25, 6);
  });

  it("returns the pair, never a position: it cannot read a view", () => {
    const store = createViewStore();
    store.push(payload(1000), 5000);
    store.push(payload(1100), 5100);

    const bracket = store.sampleAt(1050);

    expect(bracket?.from.view).toEqual({ at: 1000 });
    expect(bracket?.to?.view).toEqual({ at: 1100 });
  });

  it("gives the last known view when the moment is past everything", () => {
    const store = createViewStore();
    store.push(payload(1000), 5000);
    store.push(payload(1100), 5100);

    const bracket = store.sampleAt(1200);

    expect(bracket?.from.serverTime).toBe(1100);
    expect(bracket?.to).toBeNull();
    expect(bracket?.t).toBe(0);
  });

  it("gives the first known view when the moment is before everything", () => {
    const store = createViewStore();
    store.push(payload(1000), 5000);

    const bracket = store.sampleAt(900);

    expect(bracket?.from.serverTime).toBe(1000);
    expect(bracket?.to).toBeNull();
  });

  it("forgets what is older than the buffer", () => {
    const store = createViewStore();
    store.push(payload(1000), 5000);
    store.push(payload(1000 + INTERPOLATION_BUFFER_MS + 1), 6001);

    // The old view is beyond the window, so nothing frames a moment back there any more.
    expect(store.sampleAt(1000)?.from.serverTime).toBe(1000 + INTERPOLATION_BUFFER_MS + 1);
  });

  it("drops a view that arrives out of order", () => {
    const store = createViewStore();
    store.push(payload(1100), 5100);

    store.push(payload(1000), 5200);

    // Keeping it would break the ordering every search here relies on.
    expect(store.latest()?.serverTime).toBe(1100);
  });

  it("empties itself between two games", () => {
    const store = createViewStore();
    store.push(payload(1000), 5000);

    store.clear();

    expect(store.latest()).toBeNull();
  });
});
