import { describe, expect, it } from "vitest";

import { isCursorTagWireView } from "./isCursorTagWireView";

describe("isCursorTagWireView", () => {
  it("recognises a round, a waiting and a countdown, with or without `m`", () => {
    expect(isCursorTagWireView({ ph: 1, r: 1, t: 1000, p: [], m: [0, 0, 0, 0] })).toBe(true);
    expect(isCursorTagWireView({ ph: 0, r: 1, a: 20000, p: [] })).toBe(true);
    expect(isCursorTagWireView({ ph: 0, r: 2, c: 3000, p: [["mika", 1, 0]] })).toBe(true);
  });

  it("refuses the sandbox's view, and what is no view at all", () => {
    expect(isCursorTagWireView({ timeLeftMs: 1000, players: [], me: null })).toBe(false);
    expect(isCursorTagWireView(null)).toBe(false);
    expect(isCursorTagWireView([1, 2])).toBe(false);
    expect(isCursorTagWireView("view")).toBe(false);
  });

  it("refuses a view whose phase does not carry what it should", () => {
    expect(isCursorTagWireView({ ph: 1, r: 1, a: 1000, p: [] })).toBe(false);
    expect(isCursorTagWireView({ ph: 0, r: 1, t: 1000, p: [] })).toBe(false);
    expect(isCursorTagWireView({ ph: 2, r: 1, t: 1000, p: [] })).toBe(false);
    expect(isCursorTagWireView({ ph: 1, r: 1, t: 1000, p: [], m: "me" })).toBe(false);
  });
});
