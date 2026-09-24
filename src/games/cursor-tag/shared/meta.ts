import type { GameMeta } from "../../gameMeta";
import { MAX_PLAYERS, MIN_PLAYERS } from "./constants";

/** Told once, read by the server definition and by the client one (docs/architecture.md, §7). */
export const CURSOR_TAG_META: GameMeta = {
  id: "cursor-tag",
  name: "Cursor Tag",
  description: "Un jeu du chat à la souris. Esquive, prends les portails, ne te fais pas toucher.",
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
};
