import type { Player } from "../../shared/types";

/**
 * The player this browser plays the running game as, or `null` when it only watches
 * (docs/architecture.md, §7). A member who arrived during the game is a spectator (§5.4) even
 * though their session has a player id: the server sends them the spectator's view and ignores
 * their inputs, so their screen must show them no cursor to capture.
 */
export function playingPlayerId(
  players: readonly Player[],
  myPlayerId: string | null,
): string | null {
  const member = players.find((player) => player.playerId === myPlayerId);
  return member === undefined || member.isSpectator ? null : member.playerId;
}
