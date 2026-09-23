import { describe, expect, it } from "vitest";

import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import type { SandboxView } from "../shared/types";
import { isSandboxView, mySnapshot, otherCursors, positionOf } from "./sandboxView";

const VIEW: SandboxView = {
  timeLeftMs: 42_000,
  players: [
    { playerId: "me", x: 100, y: 200, connected: true, distance: 50 },
    { playerId: "other", x: 300, y: 400, connected: true, distance: 10 },
    { playerId: "away", x: 500, y: 600, connected: false, distance: 0 },
  ],
  me: { lastProcessedSeq: 7, budget: 42.5, backlog: { x: 12, y: -3 } },
};

describe("isSandboxView", () => {
  it("recognises a sandbox view", () => {
    expect(isSandboxView(VIEW)).toBe(true);
  });

  it("refuses anything else, since the store keeps views as unknown", () => {
    expect(isSandboxView(null)).toBe(false);
    expect(isSandboxView("a view")).toBe(false);
    expect(isSandboxView({})).toBe(false);
    expect(isSandboxView({ players: "not a list", timeLeftMs: 0 })).toBe(false);
    expect(isSandboxView({ players: [] })).toBe(false);
  });
});

describe("mySnapshot", () => {
  it("gathers what the prediction restarts from", () => {
    expect(mySnapshot(VIEW, "me")).toEqual({
      position: { x: 100, y: 200 },
      budget: 42.5,
      backlog: { x: 12, y: -3 },
      lastProcessedSeq: 7,
    });
  });

  it("has nothing for a spectator, who holds no cursor", () => {
    const spectator: SandboxView = { ...VIEW, me: null };

    expect(mySnapshot(spectator, "me")).toBeNull();
  });

  it("carries the remainder, which the prediction restarts from as it does the budget", () => {
    expect(mySnapshot(VIEW, "me")?.backlog).toEqual({ x: 12, y: -3 });
  });

  it("has nothing for a player who is not in the game", () => {
    expect(mySnapshot(VIEW, "stranger")).toBeNull();
  });

  it("carries the sequence a reconnection reset", () => {
    const fresh: SandboxView = {
      ...VIEW,
      me: { lastProcessedSeq: NO_SEQ_PROCESSED, budget: 0, backlog: { x: 0, y: 0 } },
    };

    expect(mySnapshot(fresh, "me")?.lastProcessedSeq).toBe(NO_SEQ_PROCESSED);
  });
});

describe("otherCursors", () => {
  it("leaves you out of the list", () => {
    expect(otherCursors(VIEW, "me").map((cursor) => cursor.playerId)).toEqual(["other"]);
  });

  it("leaves out a player who is away, whose cursor is not drawn", () => {
    expect(otherCursors(VIEW, "me").some((cursor) => cursor.playerId === "away")).toBe(false);
  });

  it("shows everyone to a spectator, who is nobody", () => {
    expect(otherCursors(VIEW, null).map((cursor) => cursor.playerId)).toEqual(["me", "other"]);
  });
});

describe("positionOf", () => {
  it("finds a player's place in a given view", () => {
    expect(positionOf(VIEW, "other")).toEqual({ x: 300, y: 400 });
  });

  it("says nothing about a player the view does not carry", () => {
    // A player who left between two views: the interpolation stops rather than inventing a place.
    expect(positionOf(VIEW, "stranger")).toBeNull();
  });
});
