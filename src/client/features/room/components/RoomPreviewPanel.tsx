import { pseudoKey } from "../../../../shared/pseudo";
import type { RoomPreview } from "../../../../shared/types";
import { Badge } from "../../../components/ui/Badge";
import { PlayerRow } from "./PlayerRow";

interface RoomPreviewPanelProps {
  preview: RoomPreview;
  /** A pseudo the room refused: its owner is pointed at in the list (§11.10). */
  takenPseudo?: string;
}

/** The room's players, as the invitation screen shows them (docs/architecture.md, §5.7). */
export function RoomPreviewPanel({ preview, takenPseudo }: RoomPreviewPanelProps) {
  const title =
    preview.status === "in_game" && preview.selectedGameId !== null
      ? `Partie en cours : ${preview.selectedGameId}`
      : "Déjà dans la room";

  // Same comparison as the room itself, so that the line pointed at is exactly the one that
  // refused the pseudo, whatever its case (docs/architecture.md, §4).
  const takenKey = takenPseudo === undefined ? null : pseudoKey(takenPseudo);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-page p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="t-title-3">{title}</h2>
        <span className="t-small text-ink-secondary">
          {preview.playerCount} / {preview.capacity}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {preview.players.map((player) => (
          <PlayerRow
            key={player.pseudo}
            pseudo={player.pseudo}
            color={player.color}
            taken={takenKey !== null && pseudoKey(player.pseudo) === takenKey}
            badges={player.isHost ? <Badge variant="host">Hôte</Badge> : null}
          />
        ))}
      </div>
    </div>
  );
}
