import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/** The connection is opened once, on first use, and kept for the whole session. */
function getSocket(): Socket {
  socket ??= io();
  return socket;
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
