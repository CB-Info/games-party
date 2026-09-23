import type { Player } from "../../../../shared/types";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PlusIcon } from "../../../components/ui/icons/PlusIcon";
import { PlayerSwatch } from "../../../components/ui/PlayerSwatch";

interface BotPanelProps {
  players: readonly Player[];
  onAdd: () => void;
  onRemove: (playerId: string) => void;
}

/**
 * Development bots, host only (docs/architecture.md, §8). It sits **below** the lobby's row of
 * columns: §13 describes a closed composition of three cards of equal height, and a fourth column
 * — or a block inside one of them — would move the quiet "Quitter la room" or the launch button.
 * Placed here it disturbs no documented layout and leaves the production build entirely.
 *
 * A bot can only be added from the lobby, so this panel is never shown during a game (§8).
 */
export function BotPanel({ players, onAdd, onRemove }: BotPanelProps) {
  const bots = players.filter((player) => player.isBot);

  return (
    <Card title="Développement" counter={`${bots.length} bot${bots.length > 1 ? "s" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" icon={<PlusIcon />} onClick={onAdd}>
          Ajouter un bot
        </Button>

        {bots.map((bot) => (
          <span
            key={bot.playerId}
            className="inline-flex items-center gap-2 rounded-pill border border-line py-1 pl-2 pr-1"
          >
            <PlayerSwatch color={bot.color} />
            <span className="t-small">{bot.pseudo}</span>
            <Button variant="quiet" onClick={() => onRemove(bot.playerId)}>
              Retirer
            </Button>
          </span>
        ))}
      </div>
    </Card>
  );
}
