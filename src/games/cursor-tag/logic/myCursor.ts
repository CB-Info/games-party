import type { Point } from "../../../shared/cursor/collision";
import type { CursorTagView, Role } from "../shared/types";
import { maxSpeedOf } from "./movement";

/** What a view says of the local player's own cursor, for their prediction (rules.md, §8.1). */
export interface MyCursor {
  /** The last input the server applied, or `null` for a spectator, who has no `me`. */
  lastProcessedSeq: number | null;
  /** `null` between two rounds, when there is no cursor, and for a spectator. */
  cursor: {
    position: Point;
    budget: number;
    backlog: Point;
    /** The speed of the player's role, which the server moves them at (rules.md, §6.2). */
    maxSpeed: number;
    /** While frozen the server applies none of their inputs: nothing is to be replayed. */
    frozen: boolean;
    role: Role;
  } | null;
}

/**
 * The local player's cursor in a view of Cursor Tag. Their own role and freeze come from the last
 * view, unlike the others', which are drawn at the delayed moment (rules.md, §8.1).
 */
export function myCursorIn(view: CursorTagView, myPlayerId: string): MyCursor {
  const me = view.me;
  if (me === null) {
    return { lastProcessedSeq: null, cursor: null };
  }

  const player =
    view.phase === "round"
      ? view.players.find((candidate) => candidate.playerId === myPlayerId)
      : undefined;
  if (player === undefined) {
    return { lastProcessedSeq: me.lastProcessedSeq, cursor: null };
  }

  return {
    lastProcessedSeq: me.lastProcessedSeq,
    cursor: {
      position: { x: player.x, y: player.y },
      budget: me.budget,
      backlog: me.backlog,
      maxSpeed: maxSpeedOf(player.role),
      frozen: player.frozenMsLeft > 0,
      role: player.role,
    },
  };
}
