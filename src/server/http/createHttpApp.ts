import { join } from "node:path";

import express, { type Express } from "express";
import helmet from "helmet";

import { STATIC_ASSETS_MAX_AGE_S } from "../../shared/constants";

interface HttpAppOptions {
  /** Directory holding the built client, or null in development where Vite serves it. */
  clientDir: string | null;
}

export function createHttpApp({ clientDir }: HttpAppOptions): Express {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Socket.IO polls over HTTP, then upgrades to a WebSocket: both stay on this origin.
          "connect-src": ["'self'"],
        },
      },
    }),
  );

  app.get("/healthz", (_request, response) => {
    response.type("text/plain").send("ok");
  });

  if (clientDir !== null) {
    const indexPath = join(clientDir, "index.html");

    // Asset names contain a hash, so their content never changes and they can be cached for a
    // long time. express takes milliseconds or a duration string; the reference value is seconds.
    app.use(
      express.static(clientDir, {
        index: false,
        immutable: true,
        maxAge: `${STATIC_ASSETS_MAX_AGE_S}s`,
        setHeaders(response, filePath) {
          if (filePath.endsWith(".html")) {
            response.setHeader("Cache-Control", "no-store");
          }
        },
      }),
    );

    // Routing happens in the browser: anything else returns index.html, never cached so that a
    // deployment cannot keep serving the previous one.
    app.use((request, response, next) => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        next();
        return;
      }

      response.setHeader("Cache-Control", "no-store");
      response.sendFile(indexPath);
    });
  }

  return app;
}
