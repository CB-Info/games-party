import type { GameEvent } from "../../shared/protocol";
import type { GameResults, GameViewPayload, RoomState } from "../../shared/types";

/**
 * How a room speaks to its members. The transport layer implements it with Socket.IO, so that the
 * room itself knows nothing about it (CLAUDE.md, « Rôle de chaque couche »).
 */
export interface RoomOutbound {
  /** Broadcast on every change of the room state, never at each tick (§6.2). */
  roomState(state: RoomState): void;
  /** Tells the players who lost their ready status that the host changed the game (§5.8). */
  gameChanged(playerIds: string[], gameId: string): void;
  /** One view per recipient, volatile (§6.3). */
  gameView(playerId: string, payload: GameViewPayload): void;
  /** A game event, to the whole room when `playerIds` is absent (§7). */
  gameEvent(event: GameEvent, playerIds?: string[]): void;
  gameResults(results: GameResults): void;
}
