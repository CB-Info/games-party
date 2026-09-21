import { describe, expect, it } from "vitest";

import { formatReadyCounter } from "./readyCounter";

describe("formatReadyCounter", () => {
  it("uses the plural above one", () => {
    expect(formatReadyCounter(3, 4)).toBe("3 joueurs sur 4 prêts");
  });

  it("uses the singular for a lone ready player", () => {
    expect(formatReadyCounter(1, 4)).toBe("1 joueur sur 4 prêt");
  });

  it("uses the singular for none", () => {
    expect(formatReadyCounter(0, 4)).toBe("0 joueur sur 4 prêt");
  });

  it("reads correctly when everyone is ready", () => {
    expect(formatReadyCounter(4, 4)).toBe("4 joueurs sur 4 prêts");
  });
});
