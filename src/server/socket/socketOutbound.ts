import type { GameEvent } from "../../shared/protocol";
import type { GameResults, GameViewPayload, RoomState } from "../../shared/types";
import type { RoomOutbound } from "../rooms/roomOutbound";
import { socketRoomOf, type GameServer } from "./socketTypes";

/**
 * Sends what a room produces over Socket.IO. Views are volatile: a late one is dropped rather than
 * piling up behind the others (docs/architecture.md, §6.2).
 */
export function createSocketOutbound(
  io: GameServer,
  code: string,
  socketIdOf: (playerId: string) => string | null,
): RoomOutbound {
  const room = socketRoomOf(code);

  function toPlayers(playerIds: readonly string[]): string[] {
    return playerIds.flatMap((playerId) => {
      const socketId = socketIdOf(playerId);
      return socketId === null ? [] : [socketId];
    });
  }

  return {
    roomState(state: RoomState): void {
      io.to(room).emit("room:state", state);
    },

    gameChanged(playerIds: string[], gameId: string): void {
      io.to(toPlayers(playerIds)).emit("lobby:gameChanged", { gameId });
    },

    gameView(playerId: string, payload: GameViewPayload): void {
      const socketId = socketIdOf(playerId);
      if (socketId !== null) {
        io.to(socketId).volatile.emit("game:view", payload);
      }
    },

    gameEvent(event: GameEvent, playerIds?: string[]): void {
      if (playerIds === undefined) {
        io.to(room).emit("game:event", event);
        return;
      }

      io.to(toPlayers(playerIds)).emit("game:event", event);
    },

    gameResults(results: GameResults): void {
      io.to(room).emit("game:results", results);
    },
  };
}
