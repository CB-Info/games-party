import type { ArenaTheme } from "../../../../client/engine/arenaTheme";
import {
  drawDisc,
  drawLabel,
  drawOwnRing,
  placeCursor,
  type CursorPlace,
} from "../../../../client/engine/drawCursor";
import type { Point } from "../../../../shared/cursor/collision";
import type { PlayerColorId } from "../../../../shared/types";
import { freezeSecondsShown } from "../../logic/freezeCountdown";
import { CURSOR_RADIUS } from "../../shared/constants";
import type { Role } from "../../shared/types";
import { drawChatHalo, drawEars, drawFreezeRings } from "./drawRoleMarks";

/** A cursor as Cursor Tag draws it, whatever view it was read from. */
export interface TagCursor {
  playerId: string;
  position: Point;
  color: PlayerColorId;
  pseudo: string;
  role: Role;
  /** Zero when not frozen. */
  frozenMsLeft: number;
  /** Your own cursor wears a ring, so that you find it among ten (§12). */
  isMine: boolean;
}

/**
 * Draws the cursors of Cursor Tag (docs/design-system.md, §12): the disc, a Chat's ears, halo and
 * pulse, a frozen Chat's rings and countdown, your own ring, and every label. Yours is drawn last,
 * on top of the others. `pulse` is how far the portal loop has gone, or `null` when nothing may
 * pulse.
 */
export function drawTagCursors(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  cursors: readonly TagCursor[],
  pulse: number | null,
): void {
  const ordered = [
    ...cursors.filter((cursor) => !cursor.isMine),
    ...cursors.filter((c) => c.isMine),
  ];

  for (const cursor of ordered) {
    const place = placeCursor(cursor.position, CURSOR_RADIUS, scale);
    const frozen = cursor.frozenMsLeft > 0;
    const isChat = cursor.role === "chat";

    // From the outside in: the halo or the freeze's rings, your ring over them, the ears over
    // your ring, and the disc last, covering the base of the ears as in the mark (§12).
    if (frozen) {
      drawFreezeRings(context, theme, scale, place);
    } else if (isChat) {
      drawChatHalo(context, theme, scale, place, cursor.color, pulse);
    }
    if (cursor.isMine) {
      drawOwnRing(context, theme, place);
    }
    if (isChat) {
      drawEars(context, theme, scale, place, cursor.color);
    }

    drawDisc(context, theme, place, cursor.color);
    if (frozen) {
      drawFreezeFill(context, theme, place, cursor.frozenMsLeft);
    }

    drawLabel(context, theme, place, cursor.pseudo, isChat ? " · chat" : "");
  }
}

/** A frozen cursor's disc covered with the freeze colour, and its countdown on screen (§12). */
function drawFreezeFill(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  place: CursorPlace,
  frozenMsLeft: number,
): void {
  context.fillStyle = theme.colors.freezeFill;
  context.beginPath();
  context.arc(place.x, place.y, place.radius, 0, Math.PI * 2);
  context.fill();

  const seconds = freezeSecondsShown(frozenMsLeft);
  if (seconds === null) {
    return;
  }

  const { labelFontSize, labelFontWeight, fontFamily } = theme.metrics;
  context.fillStyle = theme.colors.freezeInk;
  context.font = `${labelFontWeight} ${labelFontSize}px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(seconds), place.x, place.y);
}
