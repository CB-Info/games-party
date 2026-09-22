import type { GameMeta } from "../../gameMeta";

/**
 * Told once, read by the server definition and by the client one (docs/architecture.md, §7).
 * The sandbox is a development tool, never registered in a production build.
 */
export const SANDBOX_META: GameMeta = {
  id: "sandbox",
  name: "Bac à sable",
  description: "Un curseur, des murs, rien d'autre. Sert à éprouver le moteur.",
  minPlayers: 1,
  maxPlayers: 10,
};
