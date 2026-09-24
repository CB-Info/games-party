import type { Point } from "../../../shared/cursor/collision";

/** A straight path, run at a steady pace from `from` to `to` over one tick (rules.md, §6.3). */
export interface Segment {
  from: Point;
  to: Point;
}

/**
 * The first instant of the tick, from 0 to 1, at which two players running their paths together
 * are `reach` apart or closer; `null` if they never are (rules.md, §6.3 and §15.1). Both run at
 * the same pace, so two paths that cross at different moments of the tick do not meet.
 *
 * Worked on the motion of one player seen from the other: the gap starts at `start` and moves by
 * `drift` over the tick. The closest approach is checked first, then the earlier root of
 * `|start + s × drift| = reach` is taken, kept between 0 and that closest instant: rounding can
 * push the root past it, or cancel it, when the contact falls on the very end of the tick.
 */
export function firstContactTime(a: Segment, b: Segment, reach: number): number | null {
  if (gapAt(a, b, 0) <= reach) {
    return 0;
  }

  const start = { x: a.from.x - b.from.x, y: a.from.y - b.from.y };
  const drift = {
    x: a.to.x - a.from.x - (b.to.x - b.from.x),
    y: a.to.y - a.from.y - (b.to.y - b.from.y),
  };
  const driftSquared = drift.x * drift.x + drift.y * drift.y;
  if (driftSquared === 0) {
    // Same motion: the gap never changes, and it starts out of reach.
    return null;
  }

  const along = start.x * drift.x + start.y * drift.y;
  const closest = Math.min(1, Math.max(0, -along / driftSquared));
  if (gapAt(a, b, closest) > reach) {
    return null;
  }

  const startSquared = start.x * start.x + start.y * start.y;
  const discriminant = Math.max(0, along * along - driftSquared * (startSquared - reach * reach));
  const root = (-along - Math.sqrt(discriminant)) / driftSquared;

  return Math.min(closest, Math.max(0, root));
}

/** The shortest distance from a point to a path (rules.md, §6.4: entering a portal). */
export function distanceToSegment(point: Point, segment: Segment): number {
  const run = { x: segment.to.x - segment.from.x, y: segment.to.y - segment.from.y };
  const runSquared = run.x * run.x + run.y * run.y;
  const share =
    runSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - segment.from.x) * run.x + (point.y - segment.from.y) * run.y) / runSquared,
          ),
        );

  return Math.hypot(
    segment.from.x + run.x * share - point.x,
    segment.from.y + run.y * share - point.y,
  );
}

/**
 * Distance between the two players at instant `s` of the tick. Each position is taken as a blend
 * of the two ends, which gives both ends exactly: a contact at the very end of the tick is then the
 * end-of-tick distance, with no rounding to cost it.
 */
function gapAt(a: Segment, b: Segment, s: number): number {
  return Math.hypot(
    a.from.x * (1 - s) + a.to.x * s - (b.from.x * (1 - s) + b.to.x * s),
    a.from.y * (1 - s) + a.to.y * s - (b.from.y * (1 - s) + b.to.y * s),
  );
}
