import { interpolatePoint } from "../../../../client/engine/interpolation";
import type { Point } from "../../../../shared/cursor/collision";
import type { PlayerColorId } from "../../../../shared/types";
import type { ViewStore } from "../../../gameView.types";
import { isSandboxView, otherCursors, positionOf } from "../../logic/sandboxView";
import type { DrawableCursor } from "./drawCursors";

export interface OtherCursorsInput {
  viewStore: ViewStore<unknown>;
  myPlayerId: string | null;
  /** The display moment, already set `INTERPOLATION_DELAY_MS` behind the server clock. */
  at: number;
  colorOf: ReadonlyMap<string, PlayerColorId>;
  pseudoOf: ReadonlyMap<string, string>;
}

/**
 * Every cursor but this browser's own, placed where it was at the display moment
 * (docs/architecture.md, §6.5). These positions are never predicted: they are read between the
 * two views that frame that moment, which is why they lag the server on purpose and why they are
 * always smooth.
 */
export function otherDrawableCursors(input: OtherCursorsInput): DrawableCursor[] {
  const latest = input.viewStore.latest();
  if (latest === null || !isSandboxView(latest.view)) {
    return [];
  }

  return otherCursors(latest.view, input.myPlayerId).map((other) => ({
    position: interpolatedPosition(input, other.playerId) ?? other.position,
    pseudo: input.pseudoOf.get(other.playerId) ?? "",
    color: input.colorOf.get(other.playerId) ?? "c1",
    isMine: false,
  }));
}

/** Between the two views framing the display moment, or the last place known before them. */
function interpolatedPosition(input: OtherCursorsInput, playerId: string): Point | null {
  const bracket = input.viewStore.sampleAt(input.at);
  if (bracket === null || !isSandboxView(bracket.from.view)) {
    return null;
  }

  const from = positionOf(bracket.from.view, playerId);
  if (from === null || bracket.to === null || !isSandboxView(bracket.to.view)) {
    return from;
  }

  const to = positionOf(bracket.to.view, playerId);
  return to === null ? from : interpolatePoint(from, to, bracket.t);
}
