import { useMemo } from "react";

import type { GameClientDefinition } from "../../../../games/gameClient.types";
import type { RoomState } from "../../../../shared/types";
import { useGameChannel } from "../hooks/useGameChannel";
import { useGameView } from "../hooks/useGameView";
import { WaitingMessage } from "../../room/components/WaitingMessage";

interface GameHostProps {
  state: RoomState;
  myPlayerId: string | null;
  games: readonly GameClientDefinition[];
  onLeave: () => void;
}

/**
 * Hands a running game its screen (docs/architecture.md, §7). It owns the view buffer, which the
 * screen only reads: views arrive thirty times a second and never pass through React.
 */
export function GameHost({ state, myPlayerId, games, onLeave }: GameHostProps) {
  const viewStore = useGameView();
  const { sendInput, sendAction } = useGameChannel();
  const game = games.find((candidate) => candidate.meta.id === state.selectedGameId) ?? null;

  const me = useMemo(
    () => (myPlayerId === null ? ({ spectator: true } as const) : { playerId: myPlayerId }),
    [myPlayerId],
  );

  // Pseudos and colours are not in a view: the game reads them from the room, which broadcasts
  // them only when they change (§7).
  const players = useMemo(
    () =>
      state.players.map((player) => ({
        playerId: player.playerId,
        pseudo: player.pseudo,
        color: player.color,
      })),
    [state.players],
  );

  if (game === null) {
    // Only reachable in a production build with a development-only game selected, which the
    // registry makes impossible, or if a game were removed between two deployments.
    return (
      <main className="flex flex-1 items-start px-12 pb-10 wide:px-14">
        <WaitingMessage>Ce jeu n’est pas disponible ici.</WaitingMessage>
      </main>
    );
  }

  return (
    <game.Screen
      viewStore={viewStore}
      options={state.selectedGameOptions}
      sendInput={sendInput}
      sendAction={sendAction}
      me={me}
      players={players}
      onLeave={onLeave}
    />
  );
}
