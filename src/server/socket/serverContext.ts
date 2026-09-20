import type { ErrorCode } from "../../shared/protocol";
import type { Room } from "../rooms/Room";
import type { RoomManager } from "../rooms/RoomManager";
import type { SessionStore } from "../sessions/SessionStore";
import type { SocketRateLimiter } from "./middleware/rateLimit";
import type { GameSocket } from "./socketTypes";

/** Everything the handlers need, assembled once at start-up. */
export interface ServerContext {
  rooms: RoomManager;
  sessions: SessionStore;
  now: () => number;
  limiterOf: (socket: GameSocket) => SocketRateLimiter;
  /** Socket holding a player, so that a room can reach one recipient (§6.3). */
  socketIdOf: (playerId: string) => string | null;
  /** The room this socket sits in, or null. */
  currentRoom: (socket: GameSocket) => Room | null;
  /** Removes the socket from its room, immediately and for good (§5.1, §5.5). */
  leaveCurrentRoom: (socket: GameSocket) => void;
  /** Remembers which room a socket sits in. */
  bindSocketToRoom: (socket: GameSocket, code: string) => void;
  /** Counts an unknown-room failure and answers with the code the client should see (§9). */
  recordUnknownRoom: (socket: GameSocket) => ErrorCode;
}
