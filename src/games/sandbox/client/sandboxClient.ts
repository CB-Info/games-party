import { DemoArena } from "../../../client/features/demo/components/DemoArena";
import type { GameClientDefinition } from "../../gameClient.types";
import { SANDBOX_META } from "../shared/meta";
import { SandboxIcon } from "./SandboxIcon";
import { SandboxOptionsForm } from "./SandboxOptionsForm";
import { SandboxScreen } from "./SandboxScreen";

/**
 * The sandbox as the client offers it (docs/architecture.md, §7). `meta` is the same object the
 * server definition reads, so a name or a player count is declared once.
 *
 * The lobby preview stays the still arena of §13 until the animated demonstration arrives at step
 * 5 — and it shows the Cursor Tag arena, which is the one this game borrows.
 */
export const sandboxClient: GameClientDefinition = {
  meta: SANDBOX_META,
  Icon: SandboxIcon,
  Preview: DemoArena,
  scoreHint: "Ton score, c’est la distance parcourue.",
  Screen: SandboxScreen,
  OptionsForm: SandboxOptionsForm,
};
