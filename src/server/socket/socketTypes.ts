import type { Server, Socket } from "socket.io";

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../shared/protocol";

/** The Socket.IO server, typed by the protocol of docs/architecture.md, §6.2. */
export type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** Socket.IO room holding the members of one Games Party room (docs/architecture.md, §6.1). */
export function socketRoomOf(code: string): string {
  return `room:${code}`;
}
