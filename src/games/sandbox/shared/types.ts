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
 * The sandbox view (rules.md, §8). `me` is null for a spectator; for a player it carries the three
 * values the client needs to predict its own cursor (docs/architecture.md, §6.5).
 */
export interface SandboxView {
  timeLeftMs: number;
  players: SandboxPlayerView[];
  me: {
    lastProcessedSeq: number;
    budget: number;
  } | null;
}
