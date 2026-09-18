import { describe, expect, it } from "vitest";

import { fakeGame } from "../../games/fakeGame.fixture";
import { RoomOptions } from "./roomOptions";

const PLAYER_COUNT = 3;

describe("RoomOptions", () => {
  it("uses the defaults of a game chosen for the first time", () => {
    const options = new RoomOptions();

    expect(options.select(fakeGame, PLAYER_COUNT)).toEqual({ durationMs: 1000 });
  });

  it("restores the last options when the host comes back to a game", () => {
    const options = new RoomOptions();
    options.select(fakeGame, PLAYER_COUNT);
    options.set(fakeGame, { durationMs: 5000 }, PLAYER_COUNT);

    expect(options.select(fakeGame, PLAYER_COUNT)).toEqual({ durationMs: 5000 });
  });

  it("normalises the options it is given", () => {
    const options = new RoomOptions();

    expect(options.set(fakeGame, { durationMs: 999999 }, PLAYER_COUNT)).toEqual({
      durationMs: 10000,
    });
  });

  it("normalises the stored options again when the player count changes", () => {
    const options = new RoomOptions();
    options.set(fakeGame, { durationMs: 42 }, PLAYER_COUNT);

    expect(options.renormalize(fakeGame, PLAYER_COUNT - 1)).toEqual({ durationMs: 100 });
  });

  it("knows nothing about a game that was never chosen", () => {
    expect(new RoomOptions().get(fakeGame.id)).toBeNull();
  });
});
