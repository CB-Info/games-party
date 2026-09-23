import { describe, expect, it } from "vitest";

import { createGestureMeter } from "./gestureMeter";

const START = 10_000;
const FRAME_MS = 16;

describe("createGestureMeter: the peak", () => {
  it("measures the fastest the hand went over one send, not the average around it", () => {
    const meter = createGestureMeter();
    const peaks: number[] = [];

    // A second of stillness, a flick of four frames at fifty units each, then stillness again.
    for (let index = 0; index <= 60; index += 1) {
      peaks.push(meter.frame(START + index * FRAME_MS, 0, 0).peak);
    }
    for (let index = 1; index <= 4; index += 1) {
      peaks.push(meter.frame(START + 960 + index * FRAME_MS, 50, 50).peak);
    }
    for (let index = 1; index <= 30; index += 1) {
      peaks.push(meter.frame(START + 1024 + index * FRAME_MS, 0, 0).peak);
    }

    // Fifty units every sixteen milliseconds is 3125 units a second, whatever came before.
    expect(Math.max(...peaks)).toBeCloseTo(3125, 0);
  });

  it("measures nothing before a whole send has been seen", () => {
    const meter = createGestureMeter();
    meter.frame(START, 0, 0);

    // One frame of movement sixteen milliseconds after the first: too short a span to divide by,
    // and exactly the kind of sample that would read as an absurd speed.
    expect(meter.frame(START + FRAME_MS, 50, 50).peak).toBe(0);
  });
});

describe("createGestureMeter: the glide", () => {
  it("counts from the moment the hand stopped, not from the start of the gesture", () => {
    const meter = createGestureMeter();

    // Three frames of gesture, then the hand stops and the cursor keeps going.
    for (let index = 0; index < 3; index += 1) {
      meter.frame(START + index * FRAME_MS, 40, 20);
    }
    const glides = [3, 4, 5, 6].map((index) => meter.frame(START + index * FRAME_MS, 0, 10).glide);

    expect(glides).toEqual([16, 32, 48, 64]);
  });

  it("measures no glide while the hand is still moving", () => {
    const meter = createGestureMeter();
    meter.frame(START, 40, 20);

    expect(meter.frame(START + FRAME_MS, 40, 20).glide).toBe(0);
  });

  it("does not take a late correction for a glide once the cursor has stood still", () => {
    const meter = createGestureMeter();
    meter.frame(START, 40, 20);
    meter.frame(START + FRAME_MS, 0, 10);
    meter.frame(START + 2 * FRAME_MS, 0, 0);

    // A view lands long after and moves the prediction: that is a correction, not a catch-up.
    expect(meter.frame(START + 1200, 0, 25).glide).toBe(0);
  });

  it("measures no glide before the hand has ever moved", () => {
    expect(createGestureMeter().frame(START, 0, 25).glide).toBe(0);
  });
});
