/**
 * What a game is, told once and read by both sides (docs/architecture.md, §7). It lives in
 * `games/<id>/shared/meta.ts`: the server definition takes its bounds from it, the client
 * definition its card. Two copies of a player count would eventually disagree, and the lobby would
 * then refuse a game it had just offered.
 */
export interface GameMeta {
  /** Identifier used by `lobby:selectGame` and by both registries. */
  id: string;
  /** Displayed name, in French. */
  name: string;
  /** One sentence, shown on the game card (docs/design-system.md, §11.7). */
  description: string;
  minPlayers: number;
  maxPlayers: number;
}
