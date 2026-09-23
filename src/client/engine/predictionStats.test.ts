import { describe, expect, it } from "vitest";

import { createPredictionStats } from "./predictionStats";
import { frameAt, START } from "./predictionStats.fixture";

describe("createPredictionStats", () => {
  it("answers with zeroes before the first frame", () => {
    expect(createPredictionStats().read(START).frames).toBe(0);
  });

  it("counts the visible jumps per second", () => {
    const probe = createPredictionStats();
    for (let index = 0; index < 60; index += 1) {
      frameAt(probe, START + index * 16, index, { snapped: index % 6 === 0 });
    }

    // Ten snaps over the 944 ms the frames really span.
    expect(probe.read(START + 60 * 16).snapsPerSecond).toBeCloseTo(10 / 0.944, 1);
  });

  it("forgets what left the window", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0, { gap: 90, snapped: true });
    frameAt(probe, START + 4000, 0, { gap: 5 });

    const readout = probe.read(START + 4000);

    expect(readout.frames).toBe(1);
    expect(readout.window.gap).toBe(5);
    expect(readout.snapsPerSecond).toBe(0);
  });

  it("keeps the worst gap of the whole game, however old", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0, { gap: 90 });
    frameAt(probe, START + 4000, 0, { gap: 5 });

    expect(probe.read(START + 4000).game.gap).toBe(90);
  });

  it("keeps the largest single mouse event, in the window and over the game", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0);
    probe.asked(12);
    probe.asked(300);
    probe.asked(15);
    frameAt(probe, START + 16, 20);
    frameAt(probe, START + 5000, 20);

    const readout = probe.read(START + 5000);

    expect(readout.window.largestEvent).toBe(0);
    expect(readout.game.largestEvent).toBe(300);
  });

  it("gives the current truncation and the worst of the game", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0, { truncated: 310 });
    frameAt(probe, START + 100, 0, { truncated: 12 });

    const readout = probe.read(START + 100);

    expect(readout.truncatedNow).toBe(12);
    expect(readout.game.truncated).toBe(310);
  });

  it("keeps the fastest mouse and the worst loss of the game, once a second has been seen", () => {
    const probe = createPredictionStats();

    // A whole second of a mouse asking for a thousand units and getting a quarter of them:
    // fifty frames twenty milliseconds apart, so the window spans exactly one second.
    frameAt(probe, START, 0);
    for (let index = 1; index <= 50; index += 1) {
      probe.asked(20);
      frameAt(probe, START + index * 20, index * 5);
    }

    // Then four quiet seconds, long enough for the window to forget all of it.
    frameAt(probe, START + 6000, 250);

    const readout = probe.read(START + 6000);

    expect(readout.askedPerSecond).toBeCloseTo(0, 1);
    expect(readout.game.askedPerSecond).toBeCloseTo(1000, 0);
    expect(readout.game.lostShare).toBeCloseTo(0.75, 2);
  });

  it("does not let the first frames of a game pin the maxima", () => {
    const probe = createPredictionStats();

    // Two frames: a movement asked for, none travelled. Over five milliseconds that reads as a
    // colossal rate and a total loss, and neither says anything about the game.
    frameAt(probe, START, 0);
    probe.asked(50);
    frameAt(probe, START + 5, 0);

    expect(probe.read(START + 5).game.askedPerSecond).toBe(0);
    expect(probe.read(START + 5).game.lostShare).toBe(0);
  });

  it("keeps the peak of the game once the window has forgotten it", () => {
    const probe = createPredictionStats();
    for (let index = 0; index <= 4; index += 1) {
      frameAt(probe, START + index * 16, 0);
    }
    for (let index = 1; index <= 4; index += 1) {
      probe.asked(50);
      frameAt(probe, START + 64 + index * 16, index * 50);
    }
    frameAt(probe, START + 6000, 200);

    const readout = probe.read(START + 6000);

    expect(readout.window.peak).toBe(0);
    expect(readout.game.peak).toBeCloseTo(3125, 0);
  });

  it("keeps the longest glide of the game once the window has forgotten it", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0);
    probe.asked(30);
    frameAt(probe, START + 16, 30);

    // The hand stops; the cursor keeps going for three more frames, then stands still.
    for (let index = 1; index <= 3; index += 1) {
      frameAt(probe, START + 16 + index * 16, 30 + index * 10);
    }
    frameAt(probe, START + 6000, 60);

    const readout = probe.read(START + 6000);

    expect(readout.window.glide).toBe(0);
    expect(readout.game.glide).toBe(48);
  });
});
