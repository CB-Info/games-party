import { Suspense, lazy } from "react";

import type { Player } from "../../../../shared/types";

/**
 * The development tools of the lobby (docs/architecture.md, §8). `import.meta.env.DEV` becomes the
 * literal `false` at build time, so the branch **and everything the dynamic import reaches** —
 * the panel, its hook and the two `dev:*` requests — leave the production bundle. A static import
 * would keep them in it, however carefully the panel were hidden.
 */
const Panel = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("./BotPanelHost");
      return { default: module.BotPanelHost };
    })
  : null;

export function DevTools({ players }: { players: readonly Player[] }) {
  if (Panel === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Panel players={players} />
    </Suspense>
  );
}
