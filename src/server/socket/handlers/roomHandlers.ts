import type { AckResponse, RoomCodeData } from "../../../shared/protocol";
import { isValidPseudo, normalizePseudo } from "../../../shared/pseudo";
import { roomCreateSchema, roomJoinSchema, roomPreviewSchema } from "../../../shared/schemas";
import type { PlayerColorId } from "../../../shared/types";
import type { ServerContext } from "../serverContext";
import { socketRoomOf, type GameSocket } from "../socketTypes";

/** `room:create`, `room:preview`, `room:join` and `room:leave` (docs/architecture.md, §6.2). */
export function registerRoomHandlers(socket: GameSocket, ctx: ServerContext): void {
  socket.on("room:create", (payload, ack) => {
    const parsed = roomCreateSchema.safeParse(payload);
    const pseudo = parsed.success ? normalizePseudo(parsed.data.pseudo) : "";

    if (!parsed.success || !isValidPseudo(pseudo)) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    const room = ctx.rooms.create();
    if (room === null) {
      ack({ ok: false, error: "SERVER_FULL" });
      return;
    }

    ack(joinRoom(socket, ctx, room.code, pseudo, parsed.data.preferredColor));
  });

  socket.on("room:preview", (payload, ack) => {
    const parsed = roomPreviewSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    const room = ctx.rooms.get(parsed.data.code);
    if (room === null) {
      ack({ ok: false, error: ctx.recordUnknownRoom(socket) });
      return;
    }

    ack({ ok: true, data: room.preview() });
  });

  socket.on("room:join", (payload, ack) => {
    const parsed = roomJoinSchema.safeParse(payload);
    const pseudo = parsed.success ? normalizePseudo(parsed.data.pseudo) : "";

    if (!parsed.success || !isValidPseudo(pseudo)) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    if (ctx.rooms.get(parsed.data.code) === null) {
      ack({ ok: false, error: ctx.recordUnknownRoom(socket) });
      return;
    }

    ack(joinRoom(socket, ctx, parsed.data.code, pseudo, parsed.data.preferredColor));
  });

  socket.on("room:leave", () => {
    ctx.leaveCurrentRoom(socket);
  });
}

/**
 * Joins a room. The previous one is only left once the new seat is secured, so that a refused join
 * never costs a player the room they were already in (docs/architecture.md, §5.1).
 */
function joinRoom(
  socket: GameSocket,
  ctx: ServerContext,
  code: string,
  pseudo: string,
  preferredColor: PlayerColorId,
): AckResponse<RoomCodeData> {
  const room = ctx.rooms.get(code);
  if (room === null) {
    return { ok: false, error: "ROOM_NOT_FOUND" };
  }

  const result = room.join({
    playerId: socket.data.playerId,
    sessionToken: socket.data.sessionToken,
    pseudo,
    preferredColor,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  if (ctx.currentRoom(socket)?.code !== code) {
    ctx.leaveCurrentRoom(socket);
  }

  void socket.join(socketRoomOf(code));
  ctx.bindSocketToRoom(socket, code);
  socket.emit("room:state", room.state());
  return { ok: true, data: { code } };
}
