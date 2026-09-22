import { describe, expect, it } from "vitest";

import { MAX_INPUT_DELTA } from "../constants";
import { NO_SEQ_PROCESSED, cursorInputSchema, isNewInput } from "./cursorInput";

function accepts(value: unknown): boolean {
  return cursorInputSchema.safeParse(value).success;
}

describe("cursorInputSchema", () => {
  it("accepts a normal input", () => {
    expect(accepts({ seq: 0, dx: 12.5, dy: -3.25 })).toBe(true);
  });

  it("refuses a sequence number that is not a whole count", () => {
    expect(accepts({ seq: -1, dx: 0, dy: 0 })).toBe(false);
    expect(accepts({ seq: 1.5, dx: 0, dy: 0 })).toBe(false);
  });

  it("refuses a move larger than a player could ever make", () => {
    expect(accepts({ seq: 1, dx: MAX_INPUT_DELTA, dy: 0 })).toBe(true);
    expect(accepts({ seq: 1, dx: MAX_INPUT_DELTA + 1, dy: 0 })).toBe(false);
    expect(accepts({ seq: 1, dx: 0, dy: -MAX_INPUT_DELTA - 1 })).toBe(false);
  });

  it("refuses anything that is not a finite number", () => {
    expect(accepts({ seq: 1, dx: Number.NaN, dy: 0 })).toBe(false);
    expect(accepts({ seq: 1, dx: Number.POSITIVE_INFINITY, dy: 0 })).toBe(false);
    expect(accepts({ seq: 1, dx: "10", dy: 0 })).toBe(false);
  });

  it("refuses a payload with anything extra or missing", () => {
    expect(accepts({ seq: 1, dx: 0, dy: 0, extra: true })).toBe(false);
    expect(accepts({ seq: 1, dx: 0 })).toBe(false);
    expect(accepts(null)).toBe(false);
  });
});

describe("isNewInput", () => {
  it("takes everything when nothing has been applied yet", () => {
    expect(isNewInput({ seq: 0, dx: 0, dy: 0 }, NO_SEQ_PROCESSED)).toBe(true);
  });

  it("drops an input already applied, and the one applied last", () => {
    expect(isNewInput({ seq: 4, dx: 0, dy: 0 }, 5)).toBe(false);
    expect(isNewInput({ seq: 5, dx: 0, dy: 0 }, 5)).toBe(false);
    expect(isNewInput({ seq: 6, dx: 0, dy: 0 }, 5)).toBe(true);
  });
});
