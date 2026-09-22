import { Badge } from "../../../components/ui/Badge";
import { EmptySwatch, PlayerSwatch } from "../../../components/ui/PlayerSwatch";
import type { PlayerColorId } from "../../../../shared/types";

interface PlayerRowProps {
  pseudo: string;
  color: PlayerColorId;
  isHost?: boolean;
  /** Your own row sits on the page background, so that the "Toi" badge stays visible (§11.10). */
  isYou?: boolean;
  ready?: boolean;
  connected?: boolean;
  /** This player already wears the pseudo the room just refused (§11.10). */
  taken?: boolean;
  /** Only your own swatch opens the palette (§11.10). */
  onSwatchClick?: () => void;
}

const ROW = "flex h-[38px] items-center gap-3 rounded-md px-4";

/** One line of the player list, in the lobby and on the invitation (docs/design-system.md, §11.10). */
export function PlayerRow({
  pseudo,
  color,
  isHost = false,
  isYou = false,
  ready = false,
  connected = true,
  taken = false,
  onSwatchClick,
}: PlayerRowProps) {
  const skin = connected
    ? `border ${taken ? "border-danger" : "border-line"} ${isYou ? "bg-page" : "bg-surface"}`
    : "border border-dashed border-line-strong bg-surface";

  return (
    <div className={`${ROW} ${skin}`}>
      {onSwatchClick === undefined ? (
        <PlayerSwatch color={color} dimmed={!connected} />
      ) : (
        <button
          type="button"
          aria-label="Changer de couleur"
          onClick={onSwatchClick}
          className="focus-ring inline-flex shrink-0 rounded-pill ring-[3px] ring-surface-2 transition-[box-shadow] duration-fast ease-fast hover:ring-line-strong"
        >
          <PlayerSwatch color={color} />
        </button>
      )}

      <span
        title={pseudo}
        className={`min-w-0 flex-1 truncate t-body-strong ${connected ? "" : "text-ink-disabled"}`}
      >
        {pseudo}
      </span>

      {/* The order is decided here and nowhere else, so that no caller can get it wrong (§11.10).
          These three come and go, so they sit on the pseudo's side… */}
      {ready ? <Badge variant="ready">Prêt</Badge> : null}
      {taken ? <Badge variant="takenPseudo">C’est ce pseudo</Badge> : null}
      {connected ? null : <Badge variant="disconnected">Déconnecté</Badge>}

      {/* …and these two stay against the right edge, where they never move. */}
      {isHost ? <Badge variant="host">Hôte</Badge> : null}
      {isYou ? <Badge variant="you">Toi</Badge> : null}
    </div>
  );
}

/** The dotted line shown while the room waits for one more player (§11.10). */
export function WaitingPlayerRow() {
  return (
    <div className={`${ROW} border border-dashed border-line-strong`}>
      <EmptySwatch />
      <span className="min-w-0 flex-1 t-body text-ink-secondary">Il manque un joueur</span>
    </div>
  );
}
