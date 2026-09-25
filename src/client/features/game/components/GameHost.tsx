import { useMemo } from "react";

import type { GameClientDefinition } from "../../../../games/gameClient.types";
import type { RoomState } from "../../../../shared/types";
import { playingPlayerId } from "../../../utils/gameViewer";
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

  // A member who arrived during the game watches it, session or not: the server sends them the
  // spectator's view, so their screen asks for no mouse to capture (§5.4).
  const playingId = playingPlayerId(state.players, myPlayerId);
  const me = useMemo(
    () => (playingId === null ? ({ spectator: true } as const) : { playerId: playingId }),
    [playingId],
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
    // Only reachable in a production build with a development-only game selected, which the two
    // registries make impossible, or if a game were removed between two deployments.
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
