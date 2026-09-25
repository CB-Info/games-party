/** A CSS `cubic-bezier()` timing curve, by its two control points (docs/design-system.md, §9). */
export interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The portal loop as the design system declares it, read once with the rest of the theme (§2). */
export interface PortalLoop {
  durationMs: number;
  curve: CubicBezier;
  /** The player asked for fewer animations: nothing pulses then (§9). */
  reducedMotion: boolean;
}

/** Steps of the search for the curve's parameter: well under a thousandth of the way off. */
const BISECTION_STEPS = 24;

/** A linear curve, for a declaration the reader cannot make out. */
const LINEAR: CubicBezier = { x1: 0, y1: 0, x2: 1, y2: 1 };

/** Reads `cubic-bezier(a, b, c, d)` as the stylesheet writes it; anything else reads as linear. */
export function parseCubicBezier(value: string): CubicBezier {
  const match = /cubic-bezier\(([^)]*)\)/.exec(value);
  const numbers = match?.[1]?.split(",").map((part) => Number.parseFloat(part)) ?? [];
  const [x1, y1, x2, y2] = numbers;

  if (
    numbers.length !== 4 ||
    [x1, y1, x2, y2].some((number) => number === undefined || !Number.isFinite(number))
  ) {
    return LINEAR;
  }

  return { x1: x1 ?? 0, y1: y1 ?? 0, x2: x2 ?? 1, y2: y2 ?? 1 };
}

/**
 * How far along the curve an animation is at `progress` of its time, between 0 and 1, as a browser
 * computes a CSS timing function: the curve's horizontal axis is time, its vertical one the
 * progress of the animated value. The time is found by bisection, since x grows with the curve's
 * parameter for every curve CSS allows.
 */
export function easeAt(curve: CubicBezier, progress: number): number {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }

  let low = 0;
  let high = 1;
  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2;
    if (bezier(curve.x1, curve.x2, middle) < progress) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return bezier(curve.y1, curve.y2, (low + high) / 2);
}

/**
 * Where the portal loop stands at `now`, eased, between 0 and 1: how far a pulse ring has grown and
 * faded. Null when animations are reduced, so that nothing pulses (§9).
 */
export function portalLoopAt(loop: PortalLoop, now: number): number | null {
  if (loop.reducedMotion || loop.durationMs <= 0) {
    return null;
  }

  return easeAt(loop.curve, (now % loop.durationMs) / loop.durationMs);
}

/** One coordinate of a curve that starts at 0 and ends at 1, with its two control values. */
function bezier(first: number, second: number, t: number): number {
  const rest = 1 - t;
  return 3 * rest * rest * t * first + 3 * rest * t * t * second + t * t * t;
}
