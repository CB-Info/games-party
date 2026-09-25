import type { ArenaTheme } from "../../../../client/engine/arenaTheme";
import type { CursorPlace } from "../../../../client/engine/drawCursor";
import type { PlayerColorId } from "../../../../shared/types";

/**
 * What a Chat and a frozen Chat wear around their disc (docs/design-system.md, §12). Every size is
 * in arena units, but for the pulse's stroke, which is a screen size. They are the geometry of the
 * game, written as named constants with the values of §12 (§2).
 */

/** The halo's two crowns: how far each reaches from the centre, and its opacity. */
const HALO_INNER_RADIUS = 18;
const HALO_INNER_OPACITY = 0.28;
const HALO_OUTER_RADIUS = 23;
const HALO_OUTER_OPACITY = 0.12;

/** The Chat's pulse: from the halo's edge outwards, fading from this opacity to nothing. */
const PULSE_START_RADIUS = 23;
const PULSE_END_RADIUS = 38;
const PULSE_OPACITY = 0.25;
/** The pulse's stroke, in screen pixels. */
const PULSE_STROKE = 2;

/** The two ears: squares turned a quarter, with rounded corners, centred off the disc's centre. */
const EAR_SIZE = 9;
const EAR_CORNER = 2;
const EAR_OFFSET_X = 8.5;
const EAR_OFFSET_Y = -15.5;

/** The freeze's ring and halo: how far each reaches from the centre. */
const FREEZE_RING_RADIUS = 17;
const FREEZE_HALO_RADIUS = 21;

/**
 * A hunting Chat's halo and pulse (`pulse` is how far the portal loop has gone, or `null`). A
 * frozen Chat wears neither: it does not hunt yet.
 */
export function drawChatHalo(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  place: CursorPlace,
  color: PlayerColorId,
  pulse: number | null,
): void {
  const colour = theme.colors.player[color];

  context.save();
  context.fillStyle = colour;
  context.strokeStyle = colour;

  // The outer crown first, the inner one over it: as the two shadows of the planche.
  disc(context, place, HALO_OUTER_RADIUS * scale, HALO_OUTER_OPACITY);
  disc(context, place, HALO_INNER_RADIUS * scale, HALO_INNER_OPACITY);

  if (pulse !== null) {
    const radius = PULSE_START_RADIUS + (PULSE_END_RADIUS - PULSE_START_RADIUS) * pulse;
    context.globalAlpha = PULSE_OPACITY * (1 - pulse);
    context.lineWidth = PULSE_STROKE;
    context.beginPath();
    context.arc(place.x, place.y, radius * scale, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

/**
 * A Chat's two ears, frozen or not. They go over your own ring, which would otherwise hide them on
 * a small arena, and under the disc, which covers their base as in the mark (§10).
 */
export function drawEars(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  place: CursorPlace,
  color: PlayerColorId,
): void {
  context.save();
  context.fillStyle = theme.colors.player[color];

  for (const side of [-1, 1]) {
    context.save();
    context.translate(place.x + side * EAR_OFFSET_X * scale, place.y + EAR_OFFSET_Y * scale);
    context.rotate(Math.PI / 4);
    context.beginPath();
    const size = EAR_SIZE * scale;
    context.roundRect(-size / 2, -size / 2, size, size, EAR_CORNER * scale);
    context.fill();
    context.restore();
  }

  context.restore();
}

/** A frozen cursor's halo, with its ring over it (§12). */
export function drawFreezeRings(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  place: CursorPlace,
): void {
  context.save();
  context.fillStyle = theme.colors.freezeHalo;
  disc(context, place, FREEZE_HALO_RADIUS * scale, 1);
  context.fillStyle = theme.colors.freezeRing;
  disc(context, place, FREEZE_RING_RADIUS * scale, 1);
  context.restore();
}

function disc(
  context: CanvasRenderingContext2D,
  place: CursorPlace,
  radius: number,
  opacity: number,
): void {
  context.globalAlpha = opacity;
  context.beginPath();
  context.arc(place.x, place.y, radius, 0, Math.PI * 2);
  context.fill();
}
