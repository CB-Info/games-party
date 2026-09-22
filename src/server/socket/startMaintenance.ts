import { MAINTENANCE_INTERVAL_MS } from "../../shared/constants";
import type { RoomManager } from "../rooms/RoomManager";
import type { SessionStore } from "../sessions/SessionStore";

export interface MaintenanceDeps {
  rooms: RoomManager;
  sessions: SessionStore;
  now: () => number;
  /** Passed in so that tests can shorten it instead of waiting. */
  intervalMs?: number;
}

/**
 * The sweep that makes rooms and sessions actually expire (docs/architecture.md, §5.1 and §4).
 * Nothing else calls `pruneEmpty` or `pruneExpired`, and this is the only layer holding both
 * registers: a room is deleted between one and two intervals after it was vacated.
 */
export function startMaintenance(deps: MaintenanceDeps): () => void {
  const sweep = () => {
    // Repairs first: a session whose seat ran out of its grace delay still names the room. Left
    // alone it never looks idle, so the prune below would never reach it.
    deps.sessions.forgetRoomsWhere(
      (roomCode, playerId) => (deps.rooms.get(roomCode)?.member(playerId) ?? null) === null,
    );

    deps.rooms.pruneEmpty(deps.now());
    deps.sessions.pruneExpired(deps.now());
  };

  const timer = setInterval(sweep, deps.intervalMs ?? MAINTENANCE_INTERVAL_MS);
  // The sweep must never be the reason the process stays alive.
  timer.unref();

  return () => clearInterval(timer);
}
