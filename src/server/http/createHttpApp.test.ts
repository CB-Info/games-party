import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server as HttpServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { STATIC_ASSETS_MAX_AGE_S } from "../../shared/constants";
import { createHttpApp } from "./createHttpApp";

const INDEX_HTML = '<!doctype html><html lang="fr"><body><div id="root"></div></body></html>';
const ASSET_PATH = "assets/index-abc12345.js";
const FONT_PATH = "fonts/work-sans-latin.woff2";

/** Starts the application on a free port and returns its base URL. */
async function startServer(clientDir: string | null): Promise<{
  baseUrl: string;
  stop: () => Promise<void>;
}> {
  const server: HttpServer = createServer(createHttpApp({ clientDir }));

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Server did not listen on a TCP port");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

describe("createHttpApp without a built client", () => {
  let baseUrl = "";
  let stop: () => Promise<void>;

  beforeAll(async () => {
    ({ baseUrl, stop } = await startServer(null));
  });

  afterAll(async () => {
    await stop();
  });

  it("answers the health check with ok", async () => {
    const response = await fetch(`${baseUrl}/healthz`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("does not serve the site", async () => {
    const response = await fetch(`${baseUrl}/r/abcdefghij`);

    expect(response.status).toBe(404);
  });
});

describe("createHttpApp with a built client", () => {
  let baseUrl = "";
  let stop: () => Promise<void>;
  let clientDir = "";

  beforeAll(async () => {
    clientDir = await mkdtemp(join(tmpdir(), "games-party-client-"));
    await writeFile(join(clientDir, "index.html"), INDEX_HTML);
    await mkdir(join(clientDir, "assets"));
    await writeFile(join(clientDir, ASSET_PATH), "console.log('asset');");
    await mkdir(join(clientDir, "fonts"));
    await writeFile(join(clientDir, FONT_PATH), "not a real font");
    ({ baseUrl, stop } = await startServer(clientDir));
  });

  afterAll(async () => {
    await stop();
    await rm(clientDir, { recursive: true, force: true });
  });

  it("still answers the health check", async () => {
    const response = await fetch(`${baseUrl}/healthz`);

    expect(await response.text()).toBe("ok");
  });

  it("returns index.html on an unknown route so the client can route it", async () => {
    const response = await fetch(`${baseUrl}/r/abcdefghij`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
  });

  it("never caches index.html", async () => {
    const fallback = await fetch(`${baseUrl}/r/abcdefghij`);
    const direct = await fetch(`${baseUrl}/index.html`);

    expect(fallback.headers.get("cache-control")).toBe("no-store");
    expect(direct.headers.get("cache-control")).toBe("no-store");
  });

  it("caches hashed assets for a long time", async () => {
    const response = await fetch(`${baseUrl}/${ASSET_PATH}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      `public, max-age=${STATIC_ASSETS_MAX_AGE_S}, immutable`,
    );
  });

  it("does not cache files whose name has no hash, such as fonts", async () => {
    const response = await fetch(`${baseUrl}/${FONT_PATH}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).not.toContain("immutable");
    expect(response.headers.get("etag")).not.toBeNull();
  });
});
