import type { ArenaTheme } from "../../../../client/engine/arenaTheme";
import { withinArena } from "../../../../client/engine/drawArenaGround";
import type { ViewBracket, ViewSample } from "../../../gameView.types";
import { isCursorTagWireView } from "../../logic/isCursorTagWireView";
import { readView } from "../../logic/readView";
import type { CursorTagView } from "../../shared/types";
import { drawTagArena } from "./drawTagArena";
import { drawTagCursors, type TagCursor } from "./drawTagCursors";
import { portalsIn, type TimedBracket } from "./tagDrawables";

/**
 * Views read back, once each: a frame reads the latest view and the two framing the delayed moment,
 * sixty times a second, for views that arrive thirty times. Keyed by the sample itself, so a view
 * the buffer lets go is forgotten here too.
 */
const readViews = new WeakMap<ViewSample, CursorTagView | null>();

/** A sample's view read back, or `null` when it is not a Cursor Tag view (§7). */
export function viewOf(sample: ViewSample): CursorTagView | null {
  const known = readViews.get(sample);
  if (known !== undefined) {
    return known;
  }

  const view = isCursorTagWireView(sample.view) ? readView(sample.view) : null;
  readViews.set(sample, view);
  return view;
}

/** The two views framing the delayed moment, read back; `null` when there is nothing to read. */
export function timedBracket(bracket: ViewBracket | null): TimedBracket | null {
  const from = bracket === null ? null : viewOf(bracket.from);
  if (bracket === null || from === null) {
    return null;
  }

  const to = bracket.to === null ? null : viewOf(bracket.to);
  return {
    from: { view: from, serverTime: bracket.from.serverTime },
    to: bracket.to === null || to === null ? null : { view: to, serverTime: bracket.to.serverTime },
    t: bracket.t,
  };
}

export interface TagFrame {
  /**
   * The last view received, which says the phase and the local player's cooldowns; `null` before
   * the first one, when the arena is drawn bare.
   */
  latest: CursorTagView | null;
  cursors: readonly TagCursor[];
}

/**
 * One frame of Cursor Tag's arena (docs/design-system.md, §12): the ground and walls, the portals
 * pulsing or not, dimmed where the local player's cooldown says so, then the cursors — all clipped
 * to the arena's rounded corners. `pulse` is how far the portal loop has gone, or `null`.
 */
export function drawTagFrame(
  context: CanvasRenderingContext2D,
  theme: ArenaTheme,
  scale: number,
  frame: TagFrame,
  pulse: number | null,
): void {
  const portals =
    frame.latest === null
      ? { pulsing: false, cooldown: new Set<never>() }
      : portalsIn(frame.latest);

  withinArena(context, theme, scale, () => {
    drawTagArena(context, theme, scale, {
      pulse: portals.pulsing ? pulse : null,
      cooldown: portals.cooldown,
    });
    drawTagCursors(context, theme, scale, frame.cursors, pulse);
  });
}
