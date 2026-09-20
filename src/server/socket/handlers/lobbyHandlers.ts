import type { AckStatus } from "../../../shared/protocol";
import {
  lobbySelectGameSchema,
  lobbySetColorSchema,
  lobbySetOptionsSchema,
  lobbySetReadySchema,
  lobbyStartSchema,
} from "../../../shared/schemas";
import type { Room } from "../../rooms/Room";
import type { ServerContext } from "../serverContext";
import type { GameSocket } from "../socketTypes";

/** Lobby and results events (docs/architecture.md, §6.2). */
export function registerLobbyHandlers(socket: GameSocket, ctx: ServerContext): void {
  function withRoom(
    ack: (r: AckStatus) => void,
    act: (room: Room) => ReturnType<Room["setReady"]>,
  ) {
    const room = ctx.currentRoom(socket);
    if (room === null) {
      ack({ ok: false, error: "ROOM_NOT_FOUND" });
      return;
    }

    const error = act(room);
    ack(error === null ? { ok: true } : { ok: false, error });
  }

  socket.on("lobby:setColor", (payload, ack) => {
    const parsed = lobbySetColorSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    withRoom(ack, (room) => room.setColor(socket.data.playerId, parsed.data.color));
  });

  socket.on("lobby:selectGame", (payload, ack) => {
    const parsed = lobbySelectGameSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    withRoom(ack, (room) => room.selectGame(socket.data.playerId, parsed.data.gameId));
  });

  socket.on("lobby:setOptions", (payload, ack) => {
    const parsed = lobbySetOptionsSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    withRoom(ack, (room) => room.setOptions(socket.data.playerId, parsed.data.options));
  });

  socket.on("lobby:setReady", (payload, ack) => {
    const parsed = lobbySetReadySchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    withRoom(ack, (room) => room.setReady(socket.data.playerId, parsed.data.ready));
  });

  socket.on("lobby:start", (payload, ack) => {
    const parsed = lobbyStartSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, error: "INVALID_PAYLOAD" });
      return;
    }

    withRoom(ack, (room) => room.start(socket.data.playerId, parsed.data.force));
  });

  socket.on("results:backToLobby", (ack) => {
    withRoom(ack, (room) => room.backToLobby(socket.data.playerId));
  });
}
