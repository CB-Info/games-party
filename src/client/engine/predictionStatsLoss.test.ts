import { describe, expect, it } from "vitest";

import { createPredictionStats } from "./predictionStats";
import { frameAt, START } from "./predictionStats.fixture";

describe("the share of the gesture lost", () => {
  it("reports the share of the gesture that never reached the arena", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0);

    // The mouse asks for two hundred units; the server moves the cursor a quarter of that.
    probe.asked(200);
    frameAt(probe, START + 100, 50);

    const readout = probe.read(START + 100);

    expect(readout.askedPerSecond).toBeCloseTo(2000, 6);
    expect(readout.travelledPerSecond).toBeCloseTo(500, 6);
    expect(readout.lostShare).toBeCloseTo(0.75, 6);
  });

  it("loses nothing when the cursor follows the mouse", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0);
    probe.asked(120);
    frameAt(probe, START + 100, 120);

    expect(probe.read(START + 100).lostShare).toBe(0);
  });

  it("reads the loss from where the server put the cursor, not from the prediction", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0);

    // The server moves the cursor ten units a frame while the hand asks for forty. The prediction
    // runs ahead and is pulled back as each view lands: its to and fro would pass for distance.
    for (let index = 1; index <= 20; index += 1) {
      probe.asked(40);
      frameAt(probe, START + index * 16, index * 10 + (index % 2 === 0 ? 30 : 0), {
        officialX: index * 10,
      });
    }

    expect(probe.read(START + 20 * 16).lostShare).toBeCloseTo(0.75, 6);
  });

  it("has no share to give while the hand has asked for almost nothing", () => {
    const probe = createPredictionStats();
    frameAt(probe, START, 0);
    probe.asked(8);
    frameAt(probe, START + 16, 2);

    // Six units lost out of eight is not a loss of 75 %: it is too little to say anything.
    expect(probe.read(START + 16).lostShare).toBeNull();
  });

  it("never reads an impossible loss once the hand has been still for a while", () => {
    // Ordinary, non-round movements, then four seconds of stillness during which a view nudges the
    // cursor by a hair. Sums kept as running totals ended on crumbs of rounding here, and a share of
    // two crumbs read as a loss of 195 % — or of a hundred million per cent.
    const probe = createPredictionStats();
    let x = 400;
    let at = START;
    for (let index = 0; index < 120; index += 1) {
      at += 8.3333;
      probe.asked(3.1 + (index % 7) * 0.37);
      x += 1.9 + (index % 5) * 0.21;
      frameAt(probe, at, x);
    }

    let worst = 0;
    for (let index = 0; index < 480; index += 1) {
      at += 8.3333;
      x += index % 40 === 0 ? 1e-9 : 0;
      frameAt(probe, at, x);
      const readout = probe.read(at);
      worst = Math.max(worst, readout.lostShare ?? 0, readout.game.lostShare);
    }

    expect(worst).toBeLessThanOrEqual(1);
    expect(probe.read(at).lostShare).toBeNull();
  });
});
