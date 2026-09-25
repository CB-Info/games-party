import { describe, expect, it } from "vitest";

import { captureVeilFor, type CaptureSituation } from "./captureVeil";

const PLAYING: CaptureSituation = {
  playing: true,
  active: true,
  neverCaptured: false,
  locked: false,
};

describe("captureVeilFor", () => {
  it("invites a player whose mouse has never been captured in this game", () => {
    expect(captureVeilFor({ ...PLAYING, neverCaptured: true })).toBe("invite");
  });

  it("asks a player who lost the mouse to resume", () => {
    expect(captureVeilFor(PLAYING)).toBe("resume");
  });

  it("lays nothing over the arena while the mouse is captured", () => {
    expect(captureVeilFor({ ...PLAYING, locked: true })).toBeNull();
  });

  it("lays nothing for a spectator, who has no cursor", () => {
    expect(captureVeilFor({ ...PLAYING, playing: false, neverCaptured: true })).toBeNull();
    expect(captureVeilFor({ ...PLAYING, playing: false })).toBeNull();
  });

  it("lays nothing while the game wants no mouse, as between two rounds", () => {
    expect(captureVeilFor({ ...PLAYING, active: false, neverCaptured: true })).toBeNull();
    expect(captureVeilFor({ ...PLAYING, active: false })).toBeNull();
  });
});
