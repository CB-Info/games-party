import { useEffect, useState } from "react";

import type { GameClientDefinition } from "../../../../games/gameClient.types";
import { loadClientGames } from "../../../../games/registry.client";

/**
 * The games this browser can offer (docs/architecture.md, §7). The registry loads them with a
 * dynamic import, so that a development-only game leaves the production bundle entirely; the
 * promise is started when the module is first imported, so the lobby almost never waits.
 */
export function useGameCatalog(): readonly GameClientDefinition[] {
  const [games, setGames] = useState<readonly GameClientDefinition[]>([]);

  useEffect(() => {
    let cancelled = false;

    void loadClientGames().then((loaded) => {
      if (!cancelled) {
        setGames(loaded);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return games;
}
