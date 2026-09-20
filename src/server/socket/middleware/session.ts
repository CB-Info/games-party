import { handshakeAuthSchema } from "../../../shared/schemas";
import type { SessionStore } from "../../sessions/SessionStore";
import type { GameServer, GameSocket } from "../socketTypes";

/**
 * Binds every socket to a session before it can send anything. The token comes from the handshake
 * and is never trusted before this check; the player id the server picks is the only identity the
 * rest of the code uses (règle d'or 1, docs/architecture.md, §4).
 */
export function installSessionMiddleware(
  io: GameServer,
  sessions: SessionStore,
  now: () => number,
): void {
  io.use((socket, next) => {
    const parsed = handshakeAuthSchema.safeParse(socket.handshake.auth);
    const token = parsed.success ? parsed.data.sessionToken : undefined;
    const { session, replacedSocketId } = sessions.open(token, socket.id, now());

    socket.data.sessionToken = session.token;
    socket.data.playerId = session.playerId;

    if (replacedSocketId !== null) {
      // The seat moves to the new tab right away, so the other players see nothing (§4).
      const previous: GameSocket | undefined = io.sockets.sockets.get(replacedSocketId);
      previous?.emit("session:replaced");
      previous?.disconnect(true);
    }

    next();
  });
}
