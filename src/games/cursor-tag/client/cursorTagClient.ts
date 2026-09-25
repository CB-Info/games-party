import { CursorTagIcon } from "../../../client/assets/CursorTagIcon";
import type { GameClientDefinition } from "../../gameClient.types";
import { CURSOR_TAG_META } from "../shared/meta";
import { CursorTagScreen } from "./CursorTagScreen";
import { CursorTagOptionsForm } from "./components/CursorTagOptionsForm";
import { CursorTagPreview } from "./components/CursorTagPreview";

/**
 * Cursor Tag as the client offers it (docs/architecture.md, §7). `meta` is the same object the
 * server definition reads, so a name or a player count is declared once.
 */
export const cursorTagClient: GameClientDefinition = {
  meta: CURSOR_TAG_META,
  Icon: CursorTagIcon,
  Preview: CursorTagPreview,
  // The game's own sentence in the lobby's "Le jeu" column (docs/design-system.md, §13).
  scoreHint: "Ton score, c’est le temps passé sans être Chat.",
  Screen: CursorTagScreen,
  OptionsForm: CursorTagOptionsForm,
};
