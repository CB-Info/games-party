import { useEffect, useRef, type RefObject } from "react";

import type { PredictionProbe } from "../../../../client/engine/predictionStats.types";

/**
 * The development readout's collector, or a box that stays empty (docs/architecture.md, §6.5).
 *
 * `import.meta.env.DEV` becomes the literal `false` at build time, so the branch **and the module
 * the dynamic import reaches** leave the production bundle. A static import would keep the
 * collector in it however carefully the calls were guarded, which is the whole reason this hook
 * exists rather than a line in the renderer.
 */
export function usePredictionProbe(): RefObject<PredictionProbe | null> {
  const probe = useRef<PredictionProbe | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    let alive = true;
    void import("../../../../client/engine/predictionStats").then((module) => {
      if (alive) {
        probe.current = module.createPredictionStats();
      }
    });

    return () => {
      alive = false;
      probe.current = null;
    };
  }, []);

  return probe;
}
