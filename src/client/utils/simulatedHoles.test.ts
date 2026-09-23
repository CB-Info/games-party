import { describe, expect, it } from "vitest";

import { holeEndAt } from "./simulatedHoles";

describe("holeEndAt", () => {
  it("opens a hole over the last part of every period", () => {
    // Holes of 250 ms every 3 s: from 2750 to 3000, from 5750 to 6000…
    expect(holeEndAt(2749, 250, 3000)).toBeNull();
    expect(holeEndAt(2750, 250, 3000)).toBe(3000);
    expect(holeEndAt(2999, 250, 3000)).toBe(3000);
    expect(holeEndAt(3000, 250, 3000)).toBeNull();
    expect(holeEndAt(5800, 250, 3000)).toBe(6000);
  });

  it("opens none when no hole was asked for", () => {
    expect(holeEndAt(2900, 0, 3000)).toBeNull();
  });
});
