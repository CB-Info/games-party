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

// Render sets NODE_ENV=production and serves the site over https (§10). Everywhere else it is
// plain http, where upgrading every request would make it unreachable.
const secureOrigin = process.env.NODE_ENV === "production";

const httpServer = createServer(createHttpApp({ clientDir, secureOrigin }));
createSocketServer(httpServer);

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`PORT doit être un numéro de port valide, reçu : ${process.env.PORT}`);
  process.exit(1);
}

// Without this listener Node rethrows the error as an uncaught exception, and a busy port prints a
// stack trace instead of telling anyone what to do about it.
httpServer.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Le port ${port} est déjà utilisé. Arrête l'autre serveur, ou lance avec un autre port : PORT=3001 npm start`,
    );
    process.exit(1);
  }

  throw error;
});

httpServer.listen(port, () => {
  console.log(`Games Party listening on http://localhost:${port}`);
});
