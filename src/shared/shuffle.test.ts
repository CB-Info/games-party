import { describe, expect, it } from "vitest";

import { shuffle } from "./shuffle";

const ITEMS = ["a", "b", "c", "d"] as const;

/** Always the same draw: enough to pin the order, and to tell two sequences apart. */
function always(value: number): () => number {
  return () => value;
}

describe("shuffle", () => {
  it("keeps every item, once", () => {
    const shuffled = shuffle(ITEMS, always(0.3));

    expect([...shuffled].sort()).toEqual([...ITEMS]);
  });

  it("leaves its input untouched", () => {
    const items = ["a", "b", "c"];

    shuffle(items, always(0));

    expect(items).toEqual(["a", "b", "c"]);
  });

  it("walks from the end, as the sandbox's spawn points always have", () => {
    // With draws of 0, each item from the end swaps with the first: the order the sandbox dealt
    // its spawn points in before this function was shared must not change.
    expect(shuffle(ITEMS, always(0))).toEqual(["b", "c", "d", "a"]);
    // With draws just under 1, each item swaps with itself.
    expect(shuffle(ITEMS, always(0.999))).toEqual([...ITEMS]);
  });

  it("gives the same order for the same sequence of draws", () => {
    const draws = [0.7, 0.1, 0.5];
    const sequence = () => {
      let next = 0;
      return () => draws[next++ % draws.length] ?? 0;
    };

    expect(shuffle(ITEMS, sequence())).toEqual(shuffle(ITEMS, sequence()));
  });

  it("draws nothing for an empty list or a single item", () => {
    const never = () => {
      throw new Error("no draw expected");
    };

    expect(shuffle([], never)).toEqual([]);
    expect(shuffle(["a"], never)).toEqual(["a"]);
  });
});
