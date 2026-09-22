import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

import type { RegisteredGame } from "../../games/defineGame";
import { findGame } from "../../games/registry.server";
import { MAX_MESSAGE_BYTES } from "../../shared/constants";
import { RoomManager } from "../rooms/RoomManager";
import { SessionStore } from "../sessions/SessionStore";
import { registerGameHandlers } from "./handlers/gameHandlers";
import { registerLobbyHandlers } from "./handlers/lobbyHandlers";
import { registerRoomHandlers } from "./handlers/roomHandlers";
import { SocketRateLimiter, type RateLimiterOptions } from "./middleware/rateLimit";
import { installSessionMiddleware } from "./middleware/session";
import { restoreRoomOnConnect } from "./restoreRoomOnConnect";
import type { ServerContext } from "./serverContext";
import { createSocketOutbound } from "./socketOutbound";
import { socketRoomOf, type GameServer, type GameSocket } from "./socketTypes";
import { startMaintenance } from "./startMaintenance";

export interface SocketServerOptions {
  /** Games the host may choose. Defaults to the real registry; tests pass their own. */
  findGame?: (gameId: string) => RegisteredGame | null;
  /** Passed in so that tests can shorten the delays instead of waiting. */
  reconnectGraceMs?: number;
  resultsAutoReturnMs?: number;
  emptyRoomTtlMs?: number;
  maintenanceIntervalMs?: number;
  rateLimits?: RateLimiterOptions;
}

export interface SocketServer {
  io: GameServer;
  rooms: RoomManager;
  sessions: SessionStore;
  close: () => Promise<void>;
}

/** The site and Socket.IO share one origin, so no CORS configuration is needed. */
export function createSocketServer(
  httpServer: HttpServer,
  options: SocketServerOptions = {},
): SocketServer {
  const io: GameServer = new Server(httpServer, { maxHttpBufferSize: MAX_MESSAGE_BYTES });
  const sessions = new SessionStore();
  const now = () => Date.now();

  // One socket per player at a time, so the map holds the socket currently bound to each session.
  // Which room a player sits in is kept by the session alone, never duplicated here (§4).
  const socketIdByPlayerId = new Map<string, string>();
  const limiters = new Map<string, SocketRateLimiter>();

  const rooms = new RoomManager({
    outboundFor: (code) =>
      createSocketOutbound(io, code, (playerId) => socketIdByPlayerId.get(playerId) ?? null),
    findGame: options.findGame ?? findGame,
    random: () => Math.random(),
    now,
    reconnectGraceMs: options.reconnectGraceMs,
    resultsAutoReturnMs: options.resultsAutoReturnMs,
    emptyRoomTtlMs: options.emptyRoomTtlMs,
  });

  const ctx: ServerContext = {
    rooms,
    sessions,
    now,
    limiterOf: (socket) => {
      let limiter = limiters.get(socket.id);
      if (limiter === undefined) {
        limiter = new SocketRateLimiter(options.rateLimits);
        limiters.set(socket.id, limiter);
      }
      return limiter;
    },
    socketIdOf: (playerId) => socketIdByPlayerId.get(playerId) ?? null,
    currentRoom: (socket) => {
      const code = sessions.get(socket.data.sessionToken)?.roomCode ?? null;
      return code === null ? null : rooms.get(code);
    },
    bindSocketToRoom: (socket, code) => {
      sessions.setRoomCode(socket.data.sessionToken, code);
    },
    leaveCurrentRoom: (socket) => {
      const code = sessions.get(socket.data.sessionToken)?.roomCode ?? null;
      if (code === null) {
        return;
      }

      sessions.setRoomCode(socket.data.sessionToken, null);
      void socket.leave(socketRoomOf(code));
      rooms.get(code)?.remove(socket.data.playerId);
    },
    recordUnknownRoom: (socket) =>
      ctx.limiterOf(socket).recordJoinFailure(now()) ? "RATE_LIMITED" : "ROOM_NOT_FOUND",
  };

  installSessionMiddleware(io, sessions, now);

  io.on("connection", (socket: GameSocket) => {
    socketIdByPlayerId.set(socket.data.playerId, socket.id);
    socket.emit("session:init", {
      sessionToken: socket.data.sessionToken,
      playerId: socket.data.playerId,
    });

    installRateLimit(socket, ctx);
    restoreRoomOnConnect(socket, ctx);
    registerRoomHandlers(socket, ctx);
    registerLobbyHandlers(socket, ctx);
    registerGameHandlers(socket, ctx);

    socket.on("disconnect", () => {
      limiters.delete(socket.id);

      // The session may already have moved to another tab, which keeps the seat (§4). The store is
      // what says so: the middleware reassigns it before this socket is even told to close, while
      // the map above is only updated once the new socket reaches this handler.
      const session = sessions.get(socket.data.sessionToken);
      if (session?.socketId !== socket.id) {
        return;
      }

      socketIdByPlayerId.delete(socket.data.playerId);
      const code = session.roomCode;
      sessions.release(socket.data.sessionToken, socket.id, now());

      if (code !== null) {
        rooms.get(code)?.disconnect(socket.data.playerId);
      }
    });
  });

  const stopMaintenance = startMaintenance({
    rooms,
    sessions,
    now,
    intervalMs: options.maintenanceIntervalMs,
  });

  return {
    io,
    rooms,
    sessions,
    close: async () => {
      stopMaintenance();
      rooms.disposeAll();
      await io.close();
    },
  };
}

/**
 * Drops messages over the budget. A message expecting an answer is refused with `RATE_LIMITED` so
 * that the client knows why; the others go silently (docs/architecture.md, §9).
 */
function installRateLimit(socket: GameSocket, ctx: ServerContext): void {
  socket.use((event, next) => {
    const { allowed, kick } = ctx.limiterOf(socket).admit(ctx.now());

    if (allowed) {
      next();
      return;
    }

    if (kick) {
      socket.disconnect(true);
      return;
    }

    const ack = event.at(-1);
    if (typeof ack === "function") {
      ack({ ok: false, error: "RATE_LIMITED" });
    }
  });
}
