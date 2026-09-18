import type { PlayerColorId } from "../../shared/types";

/** A member of a room, with the bookkeeping only the server needs. */
export interface RoomMember {
  playerId: string;
  /** Session token, kept so that a reconnection finds the seat back. Never sent to a client. */
  sessionToken: string;
  pseudo: string;
  color: PlayerColorId;
  isBot: boolean;
  connected: boolean;
  /** A spectator joined during a game and plays again at the next lobby (§5.4). */
  isSpectator: boolean;
  /** Ready in the lobby. The host never has this status (§5.8). */
  ready: boolean;
  /** Points of the room's running leaderboard. */
  points: number;
  /** Order of arrival, used to elect the next host (§5.3). */
  joinedAt: number;
}

/** Players counted for the minimum, the maximum and `normalizeOptions` (docs/architecture.md, §5.3). */
export function countingPlayers(members: readonly RoomMember[]): RoomMember[] {
  return members.filter((member) => !member.isSpectator);
}
