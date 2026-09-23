import type { PredictionProbe } from "./predictionStats.types";

/** The moment every test starts at, in milliseconds. */
export const START = 10_000;

/**
 * One frame of a cursor sliding along x, with everything else quiet unless asked for. The official
 * position follows the predicted one unless a test says otherwise.
 */
export function frameAt(
  probe: PredictionProbe,
  at: number,
  x: number,
  extra: { gap?: number; snapped?: boolean; truncated?: number; officialX?: number } = {},
): void {
  probe.frame({
    at,
    gap: extra.gap ?? 0,
    snapped: extra.snapped ?? false,
    truncated: extra.truncated ?? 0,
    predicted: { x, y: 450 },
    official: { x: extra.officialX ?? x, y: 450 },
  });
}
