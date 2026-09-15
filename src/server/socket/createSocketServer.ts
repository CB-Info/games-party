import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

import { MAX_MESSAGE_BYTES } from "../../shared/constants";

/** The site and Socket.IO share one origin, so no CORS configuration is needed. */
export function createSocketServer(httpServer: HttpServer): Server {
  return new Server(httpServer, { maxHttpBufferSize: MAX_MESSAGE_BYTES });
}
