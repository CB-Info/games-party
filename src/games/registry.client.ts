import type { GameClientDefinition } from "./gameClient.types";

/**
 * Games this browser can show and play. Cursor Tag is added at step 4 (CLAUDE.md, feuille de
 * route); the sandbox is a development tool and must never reach the deployed site.
 *
 * The import is dynamic on purpose. `import.meta.env.DEV` becomes the literal `false` at build
 * time, so the branch **and the module it pulls in** leave the production bundle — a static import
 * at the top of this file would keep the whole sandbox screen in it, even with an empty list.
 * `router.tsx` uses the same shape for `/dev/ui`.
 */
async function load(): Promise<readonly GameClientDefinition[]> {
  if (!import.meta.env.DEV) {
    return [];
  }

  const { sandboxClient } = await import("./sandbox/client/sandboxClient");
  return [sandboxClient];
}

// Started once, when this module is first imported, so that the lobby rarely waits for it.
const catalog = load();

export function loadClientGames(): Promise<readonly GameClientDefinition[]> {
  return catalog;
}
