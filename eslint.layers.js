/**
 * Layer boundaries described in CLAUDE.md ("Organisation du code"), enforced by ESLint.
 *
 * Flat config caveat: when several blocks set `no-restricted-imports` for the same file, the last
 * one wins instead of merging. Every block below therefore carries its own complete deny list, and
 * the generic fallbacks come first so that the specific blocks can override them.
 */

const PATHS = {
  server: ["**/server/**"],
  client: ["**/client/**"],
  pages: ["**/pages/**"],
  features: ["**/features/**"],
  games: ["**/games/**"],
  services: ["**/services/**"],
  engine: ["**/engine/**", "**/render/**"],
};

const PACKAGES = {
  react: ["react", "react/*", "react-dom", "react-dom/*", "react-router", "react-router/*"],
  socketClient: ["socket.io-client"],
  server: ["express", "express/*", "socket.io", "helmet"],
  node: ["node:*", "fs", "fs/*", "path", "http", "https", "url", "crypto", "os", "child_process"],
};

const NO_SERVER = {
  group: [...PATHS.server, ...PACKAGES.server],
  message: "Client code never imports server code (CLAUDE.md, 'Sens des imports').",
};
const NO_CLIENT = {
  group: [...PATHS.client, ...PACKAGES.react, ...PACKAGES.socketClient],
  message: "Server code never imports client code (CLAUDE.md, 'Sens des imports').",
};
const NO_PAGES = {
  group: PATHS.pages,
  message: "Nothing imports `pages`, except `client/app/`.",
};
const NO_SERVICES = {
  group: [...PATHS.services, ...PACKAGES.socketClient],
  message: "Only hooks may reach a service. Components and pages go through a hook.",
};
const NO_SOCKET_CLIENT = {
  group: PACKAGES.socketClient,
  message: "Socket.IO stays inside `client/services`.",
};
const NO_ENGINE = {
  group: PATHS.engine,
  message: "Only hooks may drive the real-time engine.",
};
const NO_REACT = {
  group: PACKAGES.react,
  message: "This layer runs outside React (CLAUDE.md, 'Rôle de chaque couche').",
};
const NO_FEATURES = {
  group: [...PATHS.features, ...PATHS.games],
  message: "`components/ui` is generic: it imports no feature and no game.",
};
const NO_TRANSPORT = {
  group: PACKAGES.server,
  message: "Room and game logic knows nothing about Socket.IO or Express.",
};
/** Server tests drive the server through a real client connection, but never through its code. */
const NO_CLIENT_CODE = {
  group: [...PATHS.client, ...PACKAGES.react],
  message: "Server code never imports client code (CLAUDE.md, 'Sens des imports').",
};
const NO_NODE = {
  group: PACKAGES.node,
  message: "Pure layers have no side effects: no Node module here.",
};

/** `no-restricted-imports` rule entry from a list of deny groups. */
function deny(...groups) {
  return { "no-restricted-imports": ["error", { patterns: groups }] };
}

const STORAGE_GLOBALS = [
  {
    name: "localStorage",
    message: "Browser storage belongs to `client/services` only.",
  },
  {
    name: "sessionStorage",
    message: "Browser storage belongs to `client/services` only.",
  },
];

const SIDE_EFFECT_GLOBALS = [
  ...STORAGE_GLOBALS,
  { name: "window", message: "Pure layers have no side effects." },
  { name: "document", message: "Pure layers have no side effects." },
  { name: "fetch", message: "Pure layers have no side effects." },
  { name: "setTimeout", message: "Pure layers have no side effects." },
  { name: "setInterval", message: "Pure layers have no side effects." },
  { name: "requestAnimationFrame", message: "Pure layers have no side effects." },
];

const SIDE_EFFECT_PROPERTIES = [
  {
    object: "Math",
    property: "random",
    message: "Game randomness goes through `GameContext.random` (CLAUDE.md, règle d'or 7).",
  },
  { object: "Date", property: "now", message: "Pure layers receive time as a parameter." },
  { object: "performance", property: "now", message: "Pure layers receive time as a parameter." },
];

export const layerRules = [
  {
    name: "layers/storage",
    files: ["src/**"],
    rules: { "no-restricted-globals": ["error", ...STORAGE_GLOBALS] },
  },
  {
    name: "layers/client-fallback",
    files: ["src/client/**", "src/games/*/client/**"],
    rules: deny(NO_SERVER, NO_PAGES),
  },
  {
    name: "layers/server-fallback",
    files: ["src/server/**", "src/games/*/server/**"],
    rules: deny(NO_CLIENT, NO_PAGES),
  },
  {
    name: "layers/assets",
    files: ["src/client/assets/**"],
    rules: deny(NO_SERVER, NO_PAGES, NO_SERVICES, NO_ENGINE, NO_FEATURES),
  },
  {
    name: "layers/client-app",
    files: ["src/client/main.tsx", "src/client/app/**"],
    rules: deny(NO_SERVER, NO_SERVICES, NO_ENGINE),
  },
  {
    name: "layers/pages",
    files: ["src/client/pages/**"],
    rules: deny(NO_SERVER, NO_SERVICES, NO_ENGINE),
  },
  {
    name: "layers/components",
    files: ["src/client/features/*/components/**", "src/games/*/client/components/**"],
    rules: deny(NO_SERVER, NO_PAGES, NO_SERVICES, NO_ENGINE),
  },
  {
    name: "layers/components-ui",
    files: ["src/client/components/ui/**"],
    rules: deny(NO_SERVER, NO_PAGES, NO_SERVICES, NO_ENGINE, NO_FEATURES),
  },
  {
    name: "layers/hooks",
    files: ["src/client/hooks/**", "src/client/features/*/hooks/**", "src/games/*/client/hooks/**"],
    rules: deny(NO_SERVER, NO_PAGES, NO_SOCKET_CLIENT),
  },
  {
    name: "layers/engine",
    files: ["src/client/engine/**", "src/games/*/client/render/**"],
    rules: deny(NO_SERVER, NO_PAGES, NO_SERVICES, NO_REACT),
  },
  {
    name: "layers/services",
    files: ["src/client/services/**"],
    rules: {
      ...deny(NO_SERVER, NO_PAGES, NO_ENGINE, NO_REACT, NO_FEATURES),
      "no-restricted-globals": "off",
    },
  },
  {
    // An integration test of the socket server needs a real client to connect with. It stays the
    // only place where `socket.io-client` is allowed outside `client/services`.
    name: "layers/server-socket-tests",
    files: ["src/server/socket/*.test.ts", "src/server/socket/*.fixture.ts"],
    rules: deny(NO_CLIENT_CODE, NO_PAGES),
  },
  {
    name: "layers/rooms-and-games-server",
    files: ["src/server/rooms/**", "src/server/sessions/**", "src/games/*/server/**"],
    rules: deny(NO_CLIENT, NO_PAGES, NO_TRANSPORT),
  },
  {
    name: "layers/games-root",
    files: ["src/games/*.ts"],
    rules: deny(NO_CLIENT, NO_PAGES, NO_TRANSPORT),
  },
  {
    name: "layers/pure",
    files: [
      "src/shared/**",
      "src/client/utils/**",
      "src/games/*/logic/**",
      "src/games/*/shared/**",
    ],
    rules: {
      ...deny(NO_SERVER, NO_CLIENT, NO_PAGES, NO_SERVICES, NO_ENGINE, NO_REACT, NO_NODE),
      "no-restricted-globals": ["error", ...SIDE_EFFECT_GLOBALS],
      "no-restricted-properties": ["error", ...SIDE_EFFECT_PROPERTIES],
    },
  },
];
