import { describe, expect, it } from "vitest";

import { PLAYER_COLOR_IDS } from "../../shared/constants";
import { themeFrom } from "./arenaTheme";

/** A stand-in stylesheet, so the reader is tested without a browser. */
const DECLARED: Record<string, string> = {
  "--color-arena": "  #1E2422 ",
  "--color-arena-wall": "#333B37",
  "--color-arena-label": "rgba(0,0,0,.45)",
  "--color-arena-ink": "#F2F5F1",
  "--color-arena-ink-secondary": "#9BA6A0",
  "--color-portal": "#C9D2CC",
  "--radius-xl": "24px",
  "--radius-xs": "8px",
  "--type-micro-size": "12px",
  "--type-micro-font-weight": "600",
  "--font-body": '"Work Sans", system-ui, sans-serif',
};

function read(name: string): string {
  return DECLARED[name] ?? `#player${name.slice(-1)}`;
}

describe("themeFrom", () => {
  it("reads every arena colour from the variable that declares it", () => {
    const { colors } = themeFrom(read);

    expect(colors.arena).toBe("#1E2422");
    expect(colors.wall).toBe("#333B37");
    expect(colors.label).toBe("rgba(0,0,0,.45)");
    expect(colors.ink).toBe("#F2F5F1");
    expect(colors.inkSecondary).toBe("#9BA6A0");
    expect(colors.portal).toBe("#C9D2CC");
  });

  it("reads the ten player colours, in the order of their identifiers", () => {
    const { colors } = themeFrom((name) => `value(${name})`);

    expect(Object.keys(colors.player)).toEqual([...PLAYER_COLOR_IDS]);
    expect(colors.player.c1).toBe("value(--color-player-1)");
    expect(colors.player.c10).toBe("value(--color-player-10)");
  });

  it("turns the sizes into numbers a canvas can use", () => {
    const { metrics } = themeFrom(read);

    expect(metrics.arenaRadius).toBe(24);
    expect(metrics.labelRadius).toBe(8);
    expect(metrics.labelFontSize).toBe(12);
    expect(metrics.labelFontWeight).toBe(600);
    expect(metrics.fontFamily).toBe('"Work Sans", system-ui, sans-serif');
  });

  it("trims what the browser returns, which comes back padded", () => {
    expect(themeFrom(() => "  #1E2422 ").colors.arena).toBe("#1E2422");
  });
});
