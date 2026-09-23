import type { Player } from "../../../../shared/types";
import { useBots } from "../hooks/useBots";
import { BotPanel } from "./BotPanel";

/**
 * Wires the panel to the two development events. Kept apart from `BotPanel` so that the panel
 * stays a plain component `/dev/ui` can show, and so that this file — with the hook and the
 * service behind it — is only ever pulled in by the dynamic import of `DevTools`.
 */
export function BotPanelHost({ players }: { players: readonly Player[] }) {
  const bots = useBots();

  return <BotPanel players={players} onAdd={bots.add} onRemove={bots.remove} />;
}
