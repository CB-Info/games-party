import { describe, expect, it } from "vitest";

import { CURSOR_SENSITIVITY, MAX_INPUT_DELTA } from "../../shared/constants";
import { createInputAccumulator } from "./inputAccumulator";

describe("createInputAccumulator", () => {
  it("turns mouse pixels into arena units", () => {
    const accumulator = createInputAccumulator();

    // Half scale: one CSS pixel of mouse is two arena units.
    accumulator.add(10, -20, 0.5);

    expect(accumulator.take()).toEqual({
      dx: 20 * CURSOR_SENSITIVITY,
      dy: -40 * CURSOR_SENSITIVITY,
    });
  });

  it("adds up everything between two sends", () => {
    const accumulator = createInputAccumulator();

    accumulator.add(3, 4, 1);
    accumulator.add(-1, 2, 1);

    expect(accumulator.take()).toEqual({ dx: 2, dy: 6 });
  });

  it("empties itself once taken", () => {
    const accumulator = createInputAccumulator();
    accumulator.add(5, 5, 1);
    accumulator.take();

    expect(accumulator.take()).toEqual({ dx: 0, dy: 0 });
  });

  it("shows what is waiting without taking it", () => {
    const accumulator = createInputAccumulator();
    accumulator.add(5, 5, 1);

    expect(accumulator.peek()).toEqual({ dx: 5, dy: 5 });
    // The prediction peeks every frame; taking there would swallow what the sender owes.
    expect(accumulator.take()).toEqual({ dx: 5, dy: 5 });
  });

  it("keeps the move inside what the schema accepts", () => {
    const accumulator = createInputAccumulator();
    accumulator.add(MAX_INPUT_DELTA * 3, -MAX_INPUT_DELTA * 3, 1);

    expect(accumulator.take()).toEqual({ dx: MAX_INPUT_DELTA, dy: -MAX_INPUT_DELTA });
  });

  it("ignores movement before the arena has a size", () => {
    const accumulator = createInputAccumulator();

    accumulator.add(10, 10, 0);

    expect(accumulator.take()).toEqual({ dx: 0, dy: 0 });
  });

  it("drops what was gathered when the pointer lock is lost", () => {
    const accumulator = createInputAccumulator();
    accumulator.add(50, 50, 1);

    accumulator.clear();

    expect(accumulator.take()).toEqual({ dx: 0, dy: 0 });
  });
});
