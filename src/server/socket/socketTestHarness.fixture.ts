import { createServer, type Server as HttpServer } from "node:http";

import { io as connect, type Socket as ClientSocket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "../../shared/protocol";
import { ACK_TIMEOUT_MS, sessionOf, watch } from "./socketInbox.fixture";
import {
  createSocketServer,
  type SocketServer,
  type SocketServerOptions,
} from "./createSocketServer";

export type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

export interface TestClientOptions {
  /** Most tests do not need it; a test about a replaced tab needs the real client's behaviour. */
  reconnection?: boolean;
  reconnectionDelay?: number;
}

export interface TestServer {
  url: string;
  /** The running server, so that a test can read the settings it was built with. */
  socketServer: SocketServer;
  connect: (auth?: Record<string, unknown>, options?: TestClientOptions) => Promise<TestClient>;
  stop: () => Promise<void>;
}

/**
 * A real Socket.IO server on a free port, with real clients. Fake timers are never used here: they
 * would break the library's own heartbeats, so the delays are shortened instead.
 */
export async function startTestServer(options: SocketServerOptions = {}): Promise<TestServer> {
  const httpServer: HttpServer = createServer();
  const socketServer = createSocketServer(httpServer, options);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  const address = httpServer.address();
  if (address === null || typeof address === "string") {
    throw new Error("Server did not listen on a TCP port");
  }

  const url = `http://127.0.0.1:${address.port}`;
  const clients: TestClient[] = [];

  return {
    url,
    socketServer,

    connect: async (auth = {}, options = {}) => {
      const client: TestClient = connect(url, {
        forceNew: true,
        transports: ["websocket"],
        reconnection: options.reconnection ?? false,
        reconnectionDelay: options.reconnectionDelay ?? 1000,
        auth,
      });
      clients.push(client);
      watch(client);

      await new Promise<void>((resolve, reject) => {
        client.on("connect", resolve);
        client.on("connect_error", reject);
      });

      return client;
    },

    // `io.close()` closes the HTTP server it was attached to, so closing it again would throw.
    stop: async () => {
      for (const client of clients) {
        client.disconnect();
      }
      await socketServer.close();
    },
  };
}

/** Sends a request with a deadline, so that a test fails fast instead of hanging (§6.1). */
export function ask(client: TestClient): TestClient {
  return client.timeout(ACK_TIMEOUT_MS);
}

/** Connects a client and waits for the identity the server gives it (§4). */
export async function connected(server: TestServer): Promise<TestClient> {
  const client = await server.connect();
  await sessionOf(client);
  return client;
}

/** Creates a room hosted by Mika, and returns the host together with the room code. */
export async function createRoom(server: TestServer): Promise<{ host: TestClient; code: string }> {
  const host = await connected(server);
  const created = await ask(host).emitWithAck("room:create", {
    pseudo: "Mika",
    preferredColor: "c1",
  });

  if (!created.ok) {
    throw new Error(`room:create refused: ${created.error}`);
  }

  return { host, code: created.data.code };
}

export {
  ACK_TIMEOUT_MS,
  receivedStates,
  sessionOf,
  waitForState,
  waitForNextState,
  waitForView,
  waitForNextView,
  receivedViews,
  receivedArrivals,
  waitForArrival,
  waitForReplaced,
  type Arrival,
} from "./socketInbox.fixture";
