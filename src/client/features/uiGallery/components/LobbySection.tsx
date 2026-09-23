import { useState } from "react";

import { CursorTagIcon } from "../../../assets/CursorTagIcon";
import { Stepper } from "../../../components/ui/Stepper";
import { DemoArena } from "../../demo/components/DemoArena";
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
 * The three-column lobby, with Cursor Tag's own texts and settings, which arrive at step 4. The
 * application shows the same layout today with the sandbox and its one setting.
 */
export function LobbySection() {
  const [rounds, setRounds] = useState(3);

  return (
    <GallerySection
      title="Lobby · jeu choisi"
      note="Cursor Tag arrive à l’étape 4 ; dans l’application, le bac à sable emprunte la même disposition."
    >
      <div className="flex items-stretch gap-6">
        <GameColumn
          icon={<CursorTagIcon />}
          preview={<DemoArena />}
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
