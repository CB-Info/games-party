import { distance, type Point } from "../../../shared/cursor/collision";
import { PORTAL_COOLDOWN_MS, PORTAL_RADIUS } from "../shared/constants";
import { PORTAL_PAIRS, type PortalPairId } from "../shared/map";
import type { PortalEvent } from "../shared/types";
import type { RoundPlayer } from "./cursorTagState";
import { moveAtRoleSpeed } from "./movement";
import { distanceToSegment } from "./pathGeometry";

/** A portal a move went into: its pair, and the centre of the other portal of the pair. */
export interface PortalEntry {
  pair: PortalPairId;
  exit: Point;
}

/**
 * The portal a move enters, if any (rules.md, §6.4): it starts outside the circle, and its path
 * passes strictly closer to the centre than the radius, which catches a fast move straight through
 * as well as one that stops inside. A pair the player has just used does nothing to them. One move
 * is far shorter than the distance between two portals, so it can enter one at most.
 */
export function findPortalEntry(
  before: Point,
  after: Point,
  cooldowns: Readonly<Record<PortalPairId, number>>,
): PortalEntry | null {
  for (const { pair, first, second } of PORTAL_PAIRS) {
    if (cooldowns[pair] > 0) {
      continue;
    }

    for (const [portal, exit] of [
      [first, second],
      [second, first],
    ] as const) {
      const entered =
        distance(before, portal) >= PORTAL_RADIUS &&
        distanceToSegment(portal, { from: before, to: after }) < PORTAL_RADIUS;
      if (entered) {
        return { pair, exit };
      }
    }
  }

  return null;
}

/**
 * Carries a player to the other portal of the pair (rules.md, §6.4). The exit starts their path
 * for the tick, so only what they run from there on can be tagged (§6.3), and the remainder is
 * dropped: it was owed on the far side of the arena.
 */
export function teleport(player: RoundPlayer, entry: PortalEntry): RoundPlayer {
  return {
    ...player,
    position: entry.exit,
    tickStart: entry.exit,
    backlog: { x: 0, y: 0 },
    portalCooldownMs: { ...player.portalCooldownMs, [entry.pair]: PORTAL_COOLDOWN_MS },
  };
}

/** A move at the role's speed, then the portal check that follows every move (rules.md, §6.4). */
export function moveAndTeleport(
  player: RoundPlayer,
  delta: Point,
  catchUpMs: number,
): { player: RoundPlayer; events: PortalEvent[] } {
  const moved = moveAtRoleSpeed(player, delta, catchUpMs);
  const entry = findPortalEntry(player.position, moved.position, player.portalCooldownMs);

  return entry === null
    ? { player: moved, events: [] }
    : {
        player: teleport(moved, entry),
        events: [{ type: "portal", playerId: player.playerId, pair: entry.pair }],
      };
}
