import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { DEFAULT_SERVER_PORT } from "./src/shared/constants.ts";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Socket.IO starts with HTTP polling and then upgrades: `ws: true` is required.
      "/socket.io": {
        target: `http://localhost:${DEFAULT_SERVER_PORT}`,
        ws: true,
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
