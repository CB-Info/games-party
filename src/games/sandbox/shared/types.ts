import type { Point } from "../../../shared/cursor/collision";

/** What a sandbox player sees of another one. Positions are in logical units (§6.4). */
export interface SandboxPlayerView {
  playerId: string;
  x: number;
  y: number;
  connected: boolean;
  /** Distance travelled since the start, which is the whole score of this game. */
  distance: number;
}

/**
 * The sandbox view (rules.md, §8). `me` is null for a spectator; for a player it carries what the
 * client needs to predict its own cursor (docs/architecture.md, §6.5). The remainder comes from the
 * server for the same reason as the budget: it has authority over both, and a count kept by the
 * client would drift the first time an input was lost.
 */
export interface SandboxView {
  timeLeftMs: number;
  players: SandboxPlayerView[];
  me: {
    lastProcessedSeq: number;
    budget: number;
    /** Movement owed and not paid yet: always zero while « Rattrapage » is off. */
    backlog: Point;
  } | null;
}
