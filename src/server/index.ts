import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

import { DEFAULT_SERVER_PORT } from "../shared/constants";
import { createHttpApp } from "./http/createHttpApp";
import { createSocketServer } from "./socket/createSocketServer";

// After `npm run build`, dist/server.js sits next to dist/client/. In development the server runs
// from src/, where that directory does not exist: Vite serves the client itself.
const builtClientDir = fileURLToPath(new URL("client/", import.meta.url));
const clientDir = existsSync(builtClientDir) ? builtClientDir : null;

const httpServer = createServer(createHttpApp({ clientDir }));
createSocketServer(httpServer);

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);

httpServer.listen(port, () => {
  console.log(`Games Party listening on http://localhost:${port}`);
});
