import { isOutsideArena, overlapsAnyWall, type Point, type Wall } from "./collision";

/** How many directions are tried around the circle, the first one included: eighths of a turn. */
const HEADINGS_TRIED = 8;

/** How many points along the way are checked, the far end included. */
const POINTS_CHECKED = 3;

export interface HeadingSearch {
  /** Where the cursor stands. */
  from: Point;
  /** The direction it would like to take, in radians. */
  heading: number;
  radius: number;
  walls: readonly Wall[];
  /** How far ahead the way must be clear, in logical units. */
  lookAhead: number;
}

/**
 * The direction a development bot should take so as not to walk into a wall (docs/architecture.md,
 * §8): the one it would like if the way is clear, otherwise the first clear one found by turning
 * an eighth of a turn at a time, always the same way. Null when every direction is blocked. Eight
 * directions are enough to find a way out of any corner of the arena, and cheap: ten bots at thirty
 * ticks a second is three hundred of these a second at worst.
 */
export function clearHeading(search: HeadingSearch): number | null {
  for (let turn = 0; turn < HEADINGS_TRIED; turn += 1) {
    const heading = search.heading + (turn * 2 * Math.PI) / HEADINGS_TRIED;
    if (isClear(search, heading)) {
      return heading;
    }
  }

  return null;
}

/**
 * True when nothing stands along `lookAhead` in that direction. The whole way is sampled, not
 * just its end: a direction that grazes a corner has a clear end point and still walks into the
 * wall on the way there.
 */
function isClear({ from, radius, walls, lookAhead }: HeadingSearch, heading: number): boolean {
  const step = { x: Math.cos(heading), y: Math.sin(heading) };

  for (let point = 1; point <= POINTS_CHECKED; point += 1) {
    const distance = (lookAhead * point) / POINTS_CHECKED;
    const ahead = { x: from.x + step.x * distance, y: from.y + step.y * distance };

    if (isOutsideArena(ahead, radius) || overlapsAnyWall(ahead, radius, walls)) {
      return false;
    }
  }

  return true;
}
