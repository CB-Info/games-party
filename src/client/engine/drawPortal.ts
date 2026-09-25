import type { Point } from "../../shared/cursor/collision";
import type { ArenaTheme } from "./arenaTheme";

/** Thickness of a portal's ring and of its pulse, in screen pixels (docs/design-system.md, §12). */
const PORTAL_STROKE = 2;

/** Pair B's dashes and the gaps between them, in screen pixels (§12). */
const PORTAL_DASH = [8, 6];

/** Radius of the ring that pulses inside a portal, in arena units, and how it grows (§12). */
const PULSE_RADIUS = 28;
const PULSE_START_SCALE = 0.9;
const PULSE_END_SCALE = 1.5;

/** The pulse is drawn in the portal colour at 45 %, fading from 55 % of that to nothing (§12). */
const PULSE_OPACITY = 0.45 * 0.55;

export interface DrawablePortal {
  /** Where the portal is, and its radius, in arena units. */
  center: Point;
  radius: number;
  /** The pair's letter, A or B, written at the centre. */
  letter: string;
  /** Pair B is dashed and pair A solid, so that the two are told apart without colour (§12). */
  dashed: boolean;
  /**
   * How far the portal loop has gone, eased, between 0 and 1; `null` for a portal that must not
   * pulse — one without effect, or when animations are reduced. The pulse says "usable" (§12).
   */
  pulse: number | null;
  /**
   * On cooldown for the local player: its ring is dimmed, and never pulses. The letter keeps its
   * colour, since a text keeps a contrast of 4.5:1 (§1).
   */
  cooldown: boolean;
}

/**
 * One mouth of a pair of portals: its ring, its pulse and its letter (docs/design-system.md, §12).
 * The rings follow the arena's size; their strokes and the letter are screen sizes, like the pseudo
 * labels.
 */
export function drawPortal(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  portal: DrawablePortal,
): void {
  const { labelFontSize, labelFontWeight, fontFamily } = theme.metrics;
  const x = portal.center.x * scale;
  const y = portal.center.y * scale;

  context.lineWidth = PORTAL_STROKE;
  context.setLineDash(portal.dashed ? PORTAL_DASH : []);

  context.strokeStyle = portal.cooldown ? theme.colors.portalCooldown : theme.colors.portal;
  context.beginPath();
  context.arc(x, y, portal.radius * scale, 0, Math.PI * 2);
  context.stroke();

  if (portal.pulse !== null && !portal.cooldown) {
    const grown = PULSE_START_SCALE + (PULSE_END_SCALE - PULSE_START_SCALE) * portal.pulse;

    context.save();
    context.globalAlpha = PULSE_OPACITY * (1 - portal.pulse);
    context.strokeStyle = theme.colors.portal;
    context.beginPath();
    context.arc(x, y, PULSE_RADIUS * grown * scale, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  context.setLineDash([]);

  context.fillStyle = theme.colors.portal;
  context.font = `${labelFontWeight} ${labelFontSize}px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(portal.letter, x, y);
}
