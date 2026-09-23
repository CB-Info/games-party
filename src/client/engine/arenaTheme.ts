import { PLAYER_COLOR_IDS } from "../../shared/constants";
import type { PlayerColorId } from "../../shared/types";

/** Every colour the arena is drawn with (docs/design-system.md, §4.1 and §4.2). */
export interface ArenaColors {
  arena: string;
  wall: string;
  label: string;
  ink: string;
  inkSecondary: string;
  portal: string;
  player: Record<PlayerColorId, string>;
}

/**
 * The sizes the renderer needs, in **screen pixels**. A canvas cannot wear a `t-…` class, so the
 * font is composed as a `ctx.font` string from the same declarations the classes use — the values
 * are still written once, in the stylesheet (docs/design-system.md, §2 and §5).
 */
export interface ArenaMetrics {
  /** Corner radius of the arena itself (§7, xl). */
  arenaRadius: number;
  /** Corner radius of a pseudo label (§7, xs). */
  labelRadius: number;
  labelFontSize: number;
  labelFontWeight: number;
  fontFamily: string;
}

export interface ArenaTheme {
  colors: ArenaColors;
  metrics: ArenaMetrics;
}

/**
 * Builds the theme from any way of reading a CSS variable. The renderer never writes a colour or a
 * size of its own: the design system declares them once, and the canvas reads them (§2).
 */
export function themeFrom(read: (name: string) => string): ArenaTheme {
  const player = {} as Record<PlayerColorId, string>;
  PLAYER_COLOR_IDS.forEach((id, index) => {
    player[id] = read(`--color-player-${index + 1}`).trim();
  });

  return {
    colors: {
      arena: read("--color-arena").trim(),
      wall: read("--color-arena-wall").trim(),
      label: read("--color-arena-label").trim(),
      ink: read("--color-arena-ink").trim(),
      inkSecondary: read("--color-arena-ink-secondary").trim(),
      portal: read("--color-portal").trim(),
      player,
    },
    metrics: {
      arenaRadius: pixels(read("--radius-xl")),
      labelRadius: pixels(read("--radius-xs")),
      labelFontSize: pixels(read("--type-micro-size")),
      labelFontWeight: pixels(read("--type-micro-font-weight")),
      fontFamily: read("--font-body").trim(),
    },
  };
}

/**
 * The theme of the running page, read once at startup (§2). Reading it every frame would mean a
 * layout query sixty times a second for values that never change.
 */
export function readArenaTheme(): ArenaTheme {
  const style = getComputedStyle(document.documentElement);
  return themeFrom((name) => style.getPropertyValue(name));
}

function pixels(value: string): number {
  return Number.parseFloat(value);
}
