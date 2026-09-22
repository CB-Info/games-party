import { ARENA_HEIGHT, ARENA_WIDTH } from "../constants";

/** A point of the arena, in logical units (docs/architecture.md, §6.4). */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned wall of the arena, in logical units (docs/architecture.md, §6.5). */
export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * True when a disc overlaps a wall. The rule of §6.5 is strict: touching the wall exactly is not
 * an overlap, so a cursor can graze it without being pushed away.
 */
export function overlapsWall(center: Point, radius: number, wall: Wall): boolean {
  const nearest = {
    x: clamp(center.x, wall.x, wall.x + wall.width),
    y: clamp(center.y, wall.y, wall.y + wall.height),
  };

  return squaredDistance(center, nearest) < radius * radius;
}

/** True when a disc overlaps any of the walls. */
export function overlapsAnyWall(center: Point, radius: number, walls: readonly Wall[]): boolean {
  return walls.some((wall) => overlapsWall(center, radius, wall));
}

/**
 * True when the centre has left the playable area. The centre stays between `radius` and
 * `ARENA_WIDTH − radius`, and likewise in Y (§6.5), so the disc never sticks out of the arena.
 */
export function isOutsideArena(center: Point, radius: number): boolean {
  return (
    center.x < radius ||
    center.x > ARENA_WIDTH - radius ||
    center.y < radius ||
    center.y > ARENA_HEIGHT - radius
  );
}

/** Distance between two points, in logical units. */
export function distance(a: Point, b: Point): number {
  return Math.sqrt(squaredDistance(a, b));
}

function squaredDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
