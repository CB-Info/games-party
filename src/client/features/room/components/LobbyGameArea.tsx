import { useState } from "react";

import type { GameClientDefinition } from "../../../../games/gameClient.types";
import type { RoomState } from "../../../../shared/types";
import { GameCard } from "../../../components/ui/GameCard";
import { GameColumn } from "./GameColumn";
import { GameGrid } from "./GameGrid";
import { ReadyToggle } from "./ReadyToggle";
import { SettingsColumn } from "./SettingsColumn";
import { StartGameButton } from "./StartGameButton";
import { WaitingMessage } from "./WaitingMessage";

interface LobbyGameAreaProps {
  state: RoomState;
  amHost: boolean;
  amReady: boolean;
  hostPseudo: string;
  games: readonly GameClientDefinition[];
  ready: number;
  total: number;
  onSelectGame: (gameId: string) => void;
  onOptionsChange: (options: unknown) => void;
  onToggleReady: (ready: boolean) => void;
  onStart: (force: boolean) => void;
}

/**
 * Everything to the right of the player list: the game chooser, or the chosen game and its
 * settings (docs/design-system.md, §13). Split out of `LobbyScreen` so that neither goes over two
 * hundred lines.
 */
export function LobbyGameArea({
  state,
  amHost,
  amReady,
  hostPseudo,
  games,
  ready,
  total,
  onSelectGame,
  onOptionsChange,
  onToggleReady,
  onStart,
}: LobbyGameAreaProps) {
  // "Changer" reopens the grid for the host alone and sends nothing: the room keeps its game
  // until another one is picked, so the others go on seeing the settings (§11.7).
  const [changing, setChanging] = useState(false);
  const game = games.find((candidate) => candidate.meta.id === state.selectedGameId) ?? null;

  function choose(gameId: string): void {
    setChanging(false);
    onSelectGame(gameId);
  }

  if (game === null || changing) {
    if (!amHost) {
      return (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-line bg-surface p-6 shadow-1">
          <WaitingMessage>{`${hostPseudo} choisit un jeu…`}</WaitingMessage>
        </div>
      );
    }

    return (
      <GameGrid isEmpty={games.length === 0}>
        {games.map((candidate) => (
          <GameCard
            key={candidate.meta.id}
            icon={<candidate.Icon />}
            name={candidate.meta.name}
            description={candidate.meta.description}
            playersLabel={`${candidate.meta.minPlayers} à ${candidate.meta.maxPlayers} joueurs`}
            onSelect={() => choose(candidate.meta.id)}
          />
        ))}
      </GameGrid>
    );
  }

  return (
    <>
      <GameColumn
        icon={<game.Icon />}
        name={game.meta.name}
        description={game.meta.description}
        scoreHint={game.scoreHint}
        preview={<game.Preview />}
        {...(amHost ? { onChange: () => setChanging(true) } : {})}
      />

      <SettingsColumn
        ready={ready}
        total={total}
        action={
          amHost ? (
            <StartGameButton everyoneIsReady={ready === total} disabled={false} onStart={onStart} />
          ) : (
            <ReadyToggle ready={amReady} onToggle={onToggleReady} />
          )
        }
      >
        {game.OptionsForm === null ? null : (
          <game.OptionsForm
            options={state.selectedGameOptions}
            playerCount={state.players.length}
            editable={amHost}
            onChange={onOptionsChange}
          />
        )}
      </SettingsColumn>
    </>
  );
}
