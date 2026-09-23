import { describe, expect, it } from "vitest";

import { MAX_SIMULATED_LAG_MS } from "../../shared/constants";
import { readHoleMs, readLagMs } from "./lagParameter";

describe("readLagMs", () => {
  it("reads the delay a developer asked for", () => {
    expect(readLagMs("?lag=200")).toBe(200);
    expect(readLagMs("?code=abc&lag=150")).toBe(150);
  });

  it("means no delay when nothing asks for one", () => {
    expect(readLagMs("")).toBe(0);
    expect(readLagMs("?code=abc")).toBe(0);
  });

  it("ignores anything that is not a usable number", () => {
    expect(readLagMs("?lag=beaucoup")).toBe(0);
    expect(readLagMs("?lag=")).toBe(0);
    expect(readLagMs("?lag=-100")).toBe(0);
    expect(readLagMs("?lag=0")).toBe(0);
  });

  it("caps a figure that would freeze the page", () => {
    expect(readLagMs(`?lag=${MAX_SIMULATED_LAG_MS * 10}`)).toBe(MAX_SIMULATED_LAG_MS);
  });

  it("rounds to whole milliseconds", () => {
    expect(readLagMs("?lag=120.7")).toBe(121);
  });
});

describe("readHoleMs", () => {
  it("reads the length of the holes asked for, in each direction", () => {
    expect(readHoleMs("?holeIn=250", "holeIn")).toBe(250);
    expect(readHoleMs("?holeIn=250", "holeOut")).toBe(0);
    expect(readHoleMs("?lag=20&holeOut=400", "holeOut")).toBe(400);
  });

  it("follows the rules of ?lag", () => {
    expect(readHoleMs("?holeIn=trou", "holeIn")).toBe(0);
    expect(readHoleMs(`?holeIn=${MAX_SIMULATED_LAG_MS * 10}`, "holeIn")).toBe(MAX_SIMULATED_LAG_MS);
  });
});
