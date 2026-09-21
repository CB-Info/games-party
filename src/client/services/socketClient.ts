import { io, type Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/protocol";
import { sessionIdentity } from "./sessionIdentity";
import { readSessionToken, writeSessionToken } from "./sessionStorage";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

let sessionReplaced = false;
const replacedListeners = new Set<() => void>();

let connections = 0;
const reconnectionListeners = new Set<() => void>();

/**
 * The connection is opened once, on first use, and kept for the whole visit. `auth` is a function
 * so that Socket.IO reads the token again on every reconnection: the first connection has none,
 * and the one the server sends back must travel with the next handshake (docs/architecture.md, §4).
 */
export function getSocket(): GameSocket {
  if (socket === null) {
    socket = io({
      auth: (send) => {
        const token = readSessionToken();
        send(token === null ? {} : { sessionToken: token });
      },
    });

    // The server sends the identity on every connection, and only then. Storing the token is what
    // makes a returning player find their seat again; keeping the whole identity is what lets a
    // screen mounted later — the lobby, right after the home screen created the room — still know
    // who it is.
    socket.on("session:init", (identity) => {
      writeSessionToken(identity.sessionToken);
      sessionIdentity.remember(identity);
    });

    // A new connection tells everything again, room included. Warning the listeners here, and not
    // from an effect, is what guarantees they have forgotten the old room before the server's
    // answer for the new connection can arrive.
    socket.on("connect", () => {
      connections += 1;

      if (connections > 1) {
        for (const listener of reconnectionListeners) {
          listener();
        }
      }
    });

    // The seat has moved to another tab (§4). This connection is over for good: closing it here
    // rather than relying on the library means this tab can never take the seat back, which would
    // leave the two tabs stealing it from each other.
    socket.on("session:replaced", () => {
      sessionReplaced = true;
      socket?.disconnect();

      for (const listener of replacedListeners) {
        listener();
      }
    });
  }

  return socket;
}

/** True once this session has been opened in another tab, and for the rest of this page's life. */
export function isSessionReplaced(): boolean {
  return sessionReplaced;
}

export function isConnected(): boolean {
  return getSocket().connected;
}

/** Calls `onChange` whenever the connection opens or closes. Returns the unsubscribe function. */
export function subscribeToConnection(onChange: () => void): () => void {
  const currentSocket = getSocket();

  currentSocket.on("connect", onChange);
  currentSocket.on("disconnect", onChange);

  return () => {
    currentSocket.off("connect", onChange);
    currentSocket.off("disconnect", onChange);
  };
}

/**
 * One subscriber per event rather than a generic one: a generic event name does not narrow the
 * listener type, and the protocol types are what make these calls safe.
 */
export function subscribeToRoomState(listener: ServerToClientEvents["room:state"]): () => void {
  const currentSocket = getSocket();

  currentSocket.on("room:state", listener);
  return () => {
    currentSocket.off("room:state", listener);
  };
}

/**
 * Calls back every time the connection comes **back** after a drop, never on the first one. What the
 * server said before is not true any more: the room may have gone, and the seat may have expired
 * (docs/architecture.md, §10).
 */
export function subscribeToReconnection(onReconnect: () => void): () => void {
  getSocket();
  reconnectionListeners.add(onReconnect);

  return () => {
    reconnectionListeners.delete(onReconnect);
  };
}

/** Reads from the flag above rather than from the socket, so a late subscriber still learns it. */
export function subscribeToSessionReplaced(onChange: () => void): () => void {
  getSocket();
  replacedListeners.add(onChange);

  return () => {
    replacedListeners.delete(onChange);
  };
}

export function subscribeToGameChanged(
  listener: ServerToClientEvents["lobby:gameChanged"],
): () => void {
  const currentSocket = getSocket();

  currentSocket.on("lobby:gameChanged", listener);
  return () => {
    currentSocket.off("lobby:gameChanged", listener);
  };
}
