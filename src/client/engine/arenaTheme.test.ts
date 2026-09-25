import { describe, expect, it } from "vitest";

import { PLAYER_COLOR_IDS } from "../../shared/constants";
import themeStylesheet from "../styles/theme.css?raw";
import { themeFrom } from "./arenaTheme";

/** A stand-in stylesheet, so the reader is tested without a browser. */
const DECLARED: Record<string, string> = {
  "--color-arena": "  #1E2422 ",
  "--color-arena-wall": "#333B37",
  "--color-arena-label": "rgba(0,0,0,.45)",
  "--color-arena-ink": "#F2F5F1",
  "--color-arena-ink-secondary": "#9BA6A0",
  "--color-portal": "#C9D2CC",
  "--color-portal-cooldown": "rgba(201,210,204,.4)",
  "--color-freeze-fill": "rgba(142,197,232,.9)",
  "--color-freeze-ring": "rgba(142,197,232,.4)",
  "--color-freeze-halo": "rgba(142,197,232,.18)",
  "--color-freeze-ink": "#08324A",
  "--transition-duration-portal-loop": "1600ms",
  "--ease-portal-loop": "cubic-bezier(0.16, 1, 0.3, 1)",
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
    expect(colors.portalCooldown).toBe("rgba(201,210,204,.4)");
    expect(colors.freezeFill).toBe("rgba(142,197,232,.9)");
    expect(colors.freezeRing).toBe("rgba(142,197,232,.4)");
    expect(colors.freezeHalo).toBe("rgba(142,197,232,.18)");
    expect(colors.freezeInk).toBe("#08324A");
  });

  it("reads the portal loop, and whether the player asked for fewer animations", () => {
    expect(themeFrom(read).loop).toEqual({
      durationMs: 1600,
      curve: { x1: 0.16, y1: 1, x2: 0.3, y2: 1 },
      reducedMotion: false,
    });
    expect(themeFrom(read, true).loop.reducedMotion).toBe(true);
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

  it("reads only variables the stylesheet declares", () => {
    // Renamed in the stylesheet and not here, a variable would read as nothing: the portals would
    // stop pulsing, or a colour vanish, without any other test noticing.
    const read: string[] = [];
    themeFrom((name) => {
      read.push(name);
      return DECLARED[name] ?? "#000000";
    });

    expect(read.filter((name) => !themeStylesheet.includes(`${name}:`))).toEqual([]);
  });

  it("trims what the browser returns, which comes back padded", () => {
    expect(themeFrom(() => "  #1E2422 ").colors.arena).toBe("#1E2422");
  });
});
