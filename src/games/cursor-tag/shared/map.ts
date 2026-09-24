import type { Point, Wall } from "../../../shared/cursor/collision";

/**
 * The Cursor Tag arena, in logical units (rules.md, §6.5). Data only: the game's rules read it,
 * and so do the lobby illustration and the sandbox. Points and walls are the cursor engine's
 * types, so its collision helpers take them as they are.
 */

export type PortalPairId = "A" | "B";

export interface PortalPair {
  pair: PortalPairId;
  first: Point;
  second: Point;
}

export const WALLS: readonly Wall[] = [
  { x: 740, y: 390, width: 120, height: 120 },
  { x: 300, y: 200, width: 300, height: 40 },
  { x: 1000, y: 660, width: 300, height: 40 },
  { x: 1180, y: 120, width: 40, height: 260 },
  { x: 380, y: 520, width: 40, height: 260 },
];

export const PORTAL_PAIRS: readonly PortalPair[] = [
  { pair: "A", first: { x: 120, y: 120 }, second: { x: 1480, y: 780 } },
  { pair: "B", first: { x: 1480, y: 120 }, second: { x: 120, y: 780 } },
];

export const SPAWN_POINTS: readonly Point[] = [
  { x: 800, y: 160 },
  { x: 800, y: 740 },
  { x: 220, y: 450 },
  { x: 1380, y: 450 },
  { x: 560, y: 120 },
  { x: 1040, y: 780 },
  { x: 1040, y: 120 },
  { x: 560, y: 780 },
  { x: 560, y: 450 },
  { x: 1040, y: 450 },
];
