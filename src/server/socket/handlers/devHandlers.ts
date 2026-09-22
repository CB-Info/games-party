import type { AckStatus } from "../../../shared/protocol";
import { devRemoveBotSchema } from "../../../shared/schemas";
import type { ServerContext } from "../serverContext";
import type { GameSocket } from "../socketTypes";

/**
 * Development-only events (docs/architecture.md, §8). They are registered in production too, but
 * refuse everything: a handler that simply stayed silent would leave the caller's acknowledgement
 * hanging, and a refusal says plainly that the feature is not there.
 */
export function registerDevHandlers(
  socket: GameSocket,
  ctx: ServerContext,
  allowBots: boolean,
): void {
  function withRoom(ack: (r: AckStatus) => void, act: (room: NonNullable<Room>) => Refusal): void {
    if (!allowBots) {
      ack({ ok: false, error: "INVALID_STATE" });
      return;
    }

    const room = ctx.currentRoom(socket);
    if (room === null) {
      ack({ ok: false, error: "ROOM_NOT_FOUND" });
      return;
    }

    const error = act(room);
    ack(error === null ? { ok: true } : { ok: false, error });
  }

  socket.on("dev:addBot", (ack) => {
    withRoom(ack, (room) => room.addBot(socket.data.playerId));
  });

  socket.on("dev:removeBot", (payload, ack) => {
    const parsed = devRemoveBotSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    withRoom(ack, (room) => room.removeBot(socket.data.playerId, parsed.data.playerId));
  });
}

type Room = ReturnType<ServerContext["currentRoom"]>;
type Refusal = ReturnType<NonNullable<Room>["addBot"]>;
