import type { ServerContext } from "./serverContext";
import { socketRoomOf, type GameSocket } from "./socketTypes";

/**
 * Puts a reconnecting socket back into the room its session was in. The client only lets Socket.IO
 * reconnect and never asks again, so restoring the seat is the server's job
 * (docs/architecture.md, §5.5 and §10).
 */
export function restoreRoomOnConnect(socket: GameSocket, ctx: ServerContext): void {
  const code = ctx.sessions.get(socket.data.sessionToken)?.roomCode ?? null;
  if (code === null) {
    return;
  }

  const room = ctx.rooms.get(code);
  if (room === null || room.member(socket.data.playerId) === null) {
    // The room vanished, or the grace delay ran out and the seat is gone. Nothing is sent: the
    // client asks for the room when it lands on /r/<code> and gets ROOM_NOT_FOUND (§5.5).
    ctx.sessions.setRoomCode(socket.data.sessionToken, null);
    return;
  }

  // Joining first, so that the broadcast `reconnect` triggers also reaches this socket.
  void socket.join(socketRoomOf(code));
  room.reconnect(socket.data.playerId);
}
