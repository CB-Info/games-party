import type { GameClientDefinition } from "./gameClient.types";

/**
 * Games this browser can show and play. The sandbox is a development tool and must never reach the
 * deployed site; Cursor Tag stays in development too, as on the server, until its screen is
 * complete: it goes online at the last sub-step of step 4 (CLAUDE.md, feuille de route).
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

  const [{ sandboxClient }, { cursorTagClient }] = await Promise.all([
    import("./sandbox/client/sandboxClient"),
    import("./cursor-tag/client/cursorTagClient"),
  ]);
  return [sandboxClient, cursorTagClient];
}

// Started once, when this module is first imported, so that the lobby rarely waits for it.
const catalog = load();

export function loadClientGames(): Promise<readonly GameClientDefinition[]> {
  return catalog;
}
