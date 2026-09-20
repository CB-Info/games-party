import type { ErrorCode } from "../../shared/protocol";
import type { RoomStatus } from "../../shared/types";
import type { RoomMember } from "./roomMember";

/** Transitions a room may take (docs/architecture.md, §5.2). */
const ALLOWED: Record<RoomStatus, readonly RoomStatus[]> = {
  lobby: ["playing"],
  // A game either finishes, and the room shows its results, or is abandoned for lack of players.
  playing: ["results", "lobby"],
  results: ["lobby"],
};

export function canTransition(from: RoomStatus, to: RoomStatus): boolean {
  return ALLOWED[from].includes(to);
}

export interface StartConditions {
  status: RoomStatus;
  /** Null while the host has not chosen a game (docs/architecture.md, §5.3). */
  selectedGameId: string | null;
  minPlayers: number;
  maxPlayers: number;
  /** Players counted for the game: not removed, not spectators, disconnected included. */
  players: readonly RoomMember[];
  hostId: string | null;
  /** "Lancer quand même": skips the ready condition only. */
  force: boolean;
}

/**
 * The three conditions of `lobby:start`, checked in the order of docs/architecture.md, §5.3.
 * Returns the refusal code, or null when the game may start.
 */
export function checkStartConditions({
  status,
  selectedGameId,
  minPlayers,
  maxPlayers,
  players,
  hostId,
  force,
}: StartConditions): ErrorCode | null {
  if (status !== "lobby") {
    return "INVALID_STATE";
  }

  if (selectedGameId === null) {
    return "NO_GAME_SELECTED";
  }

  if (players.length < minPlayers) {
    return "NOT_ENOUGH_PLAYERS";
  }

  if (players.length > maxPlayers) {
    return "TOO_MANY_PLAYERS";
  }

  if (force) {
    return null;
  }

  // Disconnected players never block a start, and the host agrees by starting.
  const blocking = players.filter(
    (player) => player.connected && player.playerId !== hostId && !player.ready,
  );

  return blocking.length > 0 ? "NOT_ALL_READY" : null;
}
