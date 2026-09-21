import { useState } from "react";

import type { Player, PlayerColorId } from "../../../../shared/types";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { ROOM_CAPACITY } from "../../../../shared/constants";
import { orderLobbyPlayers } from "../../../utils/lobbyPlayers";
import { ColorPalette } from "./ColorPalette";
import { PlayerRow } from "./PlayerRow";

interface PlayerListProps {
  players: readonly Player[];
  hostId: string | null;
  readyPlayerIds: readonly string[];
  myPlayerId: string | null;
  onPickColor: (color: PlayerColorId) => void;
  /** The discreet "Quitter la room" button at the bottom of the card (§13). */
  footer?: React.ReactNode;
}

/** The "Joueurs" card of the lobby (docs/design-system.md, §11.10 and §13). */
export function PlayerList({
  players,
  hostId,
  readyPlayerIds,
  myPlayerId,
  onPickColor,
  footer,
}: PlayerListProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const ordered = orderLobbyPlayers(players, hostId);
  const me = players.find((player) => player.playerId === myPlayerId);

  const takenBy: Partial<Record<PlayerColorId, string>> = {};
  for (const player of players) {
    takenBy[player.color] = player.pseudo;
  }

  return (
    <Card title="Joueurs" counter={`${players.length} / ${ROOM_CAPACITY}`}>
      <div className="flex flex-col gap-2">
        {ordered.map((player) => {
          const isYou = player.playerId === myPlayerId;

          return (
            <div key={player.playerId} className="flex flex-col gap-2">
              <PlayerRow
                pseudo={player.pseudo}
                color={player.color}
                isYou={isYou}
                connected={player.connected}
                onSwatchClick={isYou ? () => setPaletteOpen((open) => !open) : undefined}
                badges={
                  <>
                    {player.playerId === hostId ? <Badge variant="host">Hôte</Badge> : null}
                    {isYou ? <Badge variant="you">Toi</Badge> : null}
                    {readyPlayerIds.includes(player.playerId) ? (
                      <Badge variant="ready">Prêt</Badge>
                    ) : null}
                    {player.connected ? null : <Badge variant="disconnected">Déconnecté</Badge>}
                  </>
                }
              />

              {isYou && paletteOpen && me !== undefined ? (
                <ColorPalette
                  takenBy={takenBy}
                  mine={me.color}
                  onPick={(color) => {
                    setPaletteOpen(false);
                    onPickColor(color);
                  }}
                  onClose={() => setPaletteOpen(false)}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {footer}
    </Card>
  );
}
