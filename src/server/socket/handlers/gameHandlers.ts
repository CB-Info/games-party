import type { ServerContext } from "../serverContext";
import type { GameSocket } from "../socketTypes";

/**
 * Game events (docs/architecture.md, §6.2). The payloads are validated by the game's own schemas,
 * inside the room, since only the game knows their shape (§7).
 */
export function registerGameHandlers(socket: GameSocket, ctx: ServerContext): void {
  socket.on("game:input", (payload) => {
    ctx.currentRoom(socket)?.handleInput(socket.data.playerId, payload);
  });

  socket.on("game:action", (payload, ack) => {
    const room = ctx.currentRoom(socket);
    if (room === null) {
      ack({ ok: false, error: "ROOM_NOT_FOUND" });
      return;
    }

    const error = room.handleAction(socket.data.playerId, payload);
    ack(error === null ? { ok: true } : { ok: false, error });
  });
}
