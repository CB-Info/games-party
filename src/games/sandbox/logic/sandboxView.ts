import type { Point } from "../../../shared/cursor/collision";
import type { SandboxView } from "../shared/types";

/** What the local cursor needs to predict where it really is (docs/architecture.md, §6.5). */
export interface MySnapshot {
  position: Point;
  /** The server's budget, which the prediction restarts from rather than counting its own. */
  budget: number;
  /** The server's remainder, for the same reason. */
  backlog: Point;
  lastProcessedSeq: number;
}

/** One of the other cursors, as it is drawn. */
export interface OtherCursor {
  playerId: string;
  position: Point;
}

/**
 * Tells a sandbox view from anything else. The store keeps views as `unknown` — it cannot know
 * their shape — so the game checks before reading, with a type guard rather than a forced
 * conversion: the check really runs, thirty times a second, and costs two comparisons.
 */
export function isSandboxView(view: unknown): view is SandboxView {
  return (
    typeof view === "object" &&
    view !== null &&
    "players" in view &&
    Array.isArray(view.players) &&
    "timeLeftMs" in view &&
    typeof view.timeLeftMs === "number"
  );
}

/**
 * Reads a sandbox view. **This is where a view is read, and nowhere else**: the engine is generic
 * and cannot know the shape of a game's view, so every extractor lives with the game
 * (docs/architecture.md, §7).
 */
export function mySnapshot(view: SandboxView, playerId: string): MySnapshot | null {
  const me = view.players.find((player) => player.playerId === playerId);
  if (me === undefined || view.me === null) {
    return null;
  }

  return {
    position: { x: me.x, y: me.y },
    budget: view.me.budget,
    backlog: view.me.backlog,
    lastProcessedSeq: view.me.lastProcessedSeq,
  };
}

/** Everyone but you, and only those still connected: an absent cursor is not drawn (§12). */
export function otherCursors(view: SandboxView, myPlayerId: string | null): OtherCursor[] {
  return view.players
    .filter((player) => player.playerId !== myPlayerId && player.connected)
    .map((player) => ({ playerId: player.playerId, position: { x: player.x, y: player.y } }));
}

/** Where one player was in a given view, for the interpolation between two of them (§6.5). */
export function positionOf(view: SandboxView, playerId: string): Point | null {
  const player = view.players.find((other) => other.playerId === playerId);
  return player === undefined ? null : { x: player.x, y: player.y };
}
