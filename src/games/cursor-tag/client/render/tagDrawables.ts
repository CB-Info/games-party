import { interpolatePoint } from "../../../../client/engine/interpolation";
import type { Point } from "../../../../shared/cursor/collision";
import type { PlayerColorId } from "../../../../shared/types";
import type { PortalPairId } from "../../shared/map";
import type { CursorTagView, RoundView } from "../../shared/types";
import type { TagCursor } from "./drawTagCursors";

/** Pseudos and colours come from the room, not from the view (docs/architecture.md, §7). */
export interface PlayerNames {
  colorOf: ReadonlyMap<string, PlayerColorId>;
  pseudoOf: ReadonlyMap<string, string>;
}

/** A view read back, with the moment of the server's clock it was stamped at. */
export interface TimedView {
  view: CursorTagView;
  serverTime: number;
}

/** Of the two views framing the display moment, how far between them it sits. */
export interface TimedBracket {
  from: TimedView;
  to: TimedView | null;
  t: number;
}

/**
 * The other players as they are drawn, at the delayed moment `at` (rules.md, §8.1). The position
 * slides between the two views framing that moment; the role and the freeze come from the earlier
 * one, whose countdown runs on since. A Runner thus becomes a Chat exactly where the server tagged
 * them, and nobody changes role half a tick early. A player away is not drawn (§12).
 */
export function othersAt(
  bracket: TimedBracket | null,
  at: number,
  myPlayerId: string | null,
  names: PlayerNames,
): TagCursor[] {
  if (bracket === null || bracket.from.view.phase !== "round") {
    return [];
  }

  const later: RoundView | null = bracket.to?.view.phase === "round" ? bracket.to.view : null;
  const elapsed = Math.max(0, at - bracket.from.serverTime);

  return bracket.from.view.players
    .filter((player) => player.connected && player.playerId !== myPlayerId)
    .map((player) => {
      const from = { x: player.x, y: player.y };
      const next = later?.players.find((candidate) => candidate.playerId === player.playerId);

      return {
        playerId: player.playerId,
        position:
          next === undefined ? from : interpolatePoint(from, { x: next.x, y: next.y }, bracket.t),
        color: names.colorOf.get(player.playerId) ?? "c1",
        pseudo: names.pseudoOf.get(player.playerId) ?? "",
        role: player.role,
        frozenMsLeft: Math.max(0, player.frozenMsLeft - elapsed),
        isMine: false,
      };
    });
}

/**
 * The local player's cursor, where their prediction draws it. Their own role and freeze come from
 * the last view, not the delayed one (rules.md, §8.1). None between two rounds.
 */
export function mineAt(
  latest: CursorTagView,
  myPlayerId: string,
  drawn: Point,
  names: PlayerNames,
): TagCursor | null {
  const player =
    latest.phase === "round"
      ? latest.players.find((candidate) => candidate.playerId === myPlayerId)
      : undefined;

  return player === undefined
    ? null
    : {
        playerId: myPlayerId,
        position: drawn,
        color: names.colorOf.get(myPlayerId) ?? "c1",
        pseudo: names.pseudoOf.get(myPlayerId) ?? "",
        role: player.role,
        frozenMsLeft: player.frozenMsLeft,
        isMine: true,
      };
}

/**
 * Whether the portals pulse, and which pairs are on cooldown for the local player (§12). Nothing
 * pulses between two rounds, where the portals have no effect; a spectator, who has no `me`, sees
 * no cooldown.
 */
export function portalsIn(latest: CursorTagView): {
  pulsing: boolean;
  cooldown: ReadonlySet<PortalPairId>;
} {
  if (latest.phase !== "round" || latest.me === null) {
    return { pulsing: latest.phase === "round", cooldown: new Set() };
  }

  const { portalCooldownMs } = latest.me;
  const pairs: PortalPairId[] = ["A", "B"];
  return { pulsing: true, cooldown: new Set(pairs.filter((pair) => portalCooldownMs[pair] > 0)) };
}
