import { Suspense, lazy } from "react";

import type { PredictionReadoutSource } from "../hooks/usePredictionReadout";

/**
 * The development readout of a game, or nothing at all (docs/architecture.md, §6.5). Same shape as
 * `DevTools`: `import.meta.env.DEV` becomes the literal `false` at build time, so the branch and
 * everything the dynamic import reaches — the panel, its hook and the collector the renderer loads
 * the same way — leave the production bundle.
 */
const Hud = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("./PredictionHud");
      return { default: module.PredictionHud };
    })
  : null;

export function DevHud(source: PredictionReadoutSource) {
  if (Hud === null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Hud {...source} />
    </Suspense>
  );
}
