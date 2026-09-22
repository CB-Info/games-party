import { useState } from "react";

import { Stepper } from "../../../components/ui/Stepper";
import { GameColumn } from "../../room/components/GameColumn";
import { ReadyToggle } from "../../room/components/ReadyToggle";
import { SettingsColumn } from "../../room/components/SettingsColumn";
import { StartGameButton } from "../../room/components/StartGameButton";
import { GallerySection } from "./GallerySection";

const GAME_NAME = "Cursor Tag";
const GAME_DESCRIPTION =
  "Un jeu du chat à la souris. Esquive, prends les portails, ne te fais pas toucher.";
const SCORE_HINT = "Ton score, c’est le temps passé sans être Chat.";

/**
 * The three-column lobby, which the application cannot show yet: no game is registered before
 * step 4, so a room always stays in its "aucun jeu choisi" shape. The settings shown here stand in
 * for the form the game will provide (docs/architecture.md, §7).
 */
export function LobbySection() {
  const [rounds, setRounds] = useState(3);

  return (
    <GallerySection
      title="Lobby · jeu choisi"
      note="Inaccessible dans l’application tant qu’aucun jeu n’est enregistré (étape 4)."
    >
      <div className="flex items-stretch gap-6">
        <GameColumn
          name={GAME_NAME}
          description={GAME_DESCRIPTION}
          scoreHint={SCORE_HINT}
          onChange={() => undefined}
        />

        <SettingsColumn
          ready={3}
          total={4}
          action={
            <StartGameButton everyoneIsReady={false} disabled={false} onStart={() => undefined} />
          }
        >
          <Stepper
            label="Nombre de manches"
            value={`${rounds}`}
            editable
            onDecrement={() => setRounds((value) => value - 1)}
            onIncrement={() => setRounds((value) => value + 1)}
          />
          <Stepper label="Durée d’une manche" value="60 s" editable={false} />
        </SettingsColumn>
      </div>

      <div className="flex items-stretch gap-6">
        <SettingsColumn
          ready={4}
          total={4}
          action={<StartGameButton everyoneIsReady disabled={false} onStart={() => undefined} />}
        />
        <SettingsColumn
          ready={2}
          total={4}
          action={<ReadyToggle ready={false} onToggle={() => undefined} />}
        />
        <SettingsColumn
          ready={3}
          total={4}
          action={<ReadyToggle ready onToggle={() => undefined} />}
          blockedReason="Il faut au moins 3 joueurs pour Cursor Tag."
        />
      </div>
    </GallerySection>
  );
}
