import { afterEach, describe, expect, it, vi } from "vitest";

import { SIMULATED_HOLE_EVERY_MS } from "../../shared/constants";

const HOLE_MS = 250;

/**
 * The simulator reads its query string once, when it is first loaded, from the page's address: a
 * fresh copy is loaded for each test, with an address of the test's choosing.
 */
async function simulatorAt(search: string) {
  vi.stubGlobal("window", { location: { search } });
  vi.resetModules();
  return import("./simulatedLatency");
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a hole in what the client sends", () => {
  it("lets what it held go in order, one message per task", async () => {
    // One task each: released in a single pass, Socket.IO would keep only the first volatile input
    // (docs/architecture.md, §6.2), and the hole would simulate a loss instead of a burst.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const { throughSimulatedHole } = await simulatorAt(`?holeOut=${HOLE_MS}`);
    vi.advanceTimersByTime(SIMULATED_HOLE_EVERY_MS - HOLE_MS / 2);
    const sent: number[] = [];

    for (const input of [1, 2, 3]) {
      throughSimulatedHole("out", () => sent.push(input));
    }
    expect(sent).toEqual([]);

    vi.advanceTimersToNextTimer();
    expect(sent).toEqual([1]);
    vi.advanceTimersToNextTimer();
    expect(sent).toEqual([1, 2]);
    vi.advanceTimersToNextTimer();
    expect(sent).toEqual([1, 2, 3]);
  });

  it("keeps a message that comes while the hole is still letting go behind what it held", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const { throughSimulatedHole } = await simulatorAt(`?holeOut=${HOLE_MS}`);
    vi.advanceTimersByTime(SIMULATED_HOLE_EVERY_MS - HOLE_MS / 2);
    const sent: number[] = [];
    throughSimulatedHole("out", () => sent.push(1));
    throughSimulatedHole("out", () => sent.push(2));

    vi.advanceTimersToNextTimer();
    // The hole is closed, but the second message is still waiting: the newcomer goes after it.
    throughSimulatedHole("out", () => sent.push(3));
    expect(sent).toEqual([1]);

    vi.runAllTimers();
    expect(sent).toEqual([1, 2, 3]);
  });

  it("lets a message through at once when no hole is open and nothing is held", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const { throughSimulatedHole } = await simulatorAt(`?holeOut=${HOLE_MS}`);
    const sent: number[] = [];

    throughSimulatedHole("out", () => sent.push(1));

    expect(sent).toEqual([1]);
  });
});
