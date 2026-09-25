import { useState } from "react";

import { CursorTagOptionsForm } from "../../../../games/cursor-tag/client/components/CursorTagOptionsForm";
import { CursorTagPreview } from "../../../../games/cursor-tag/client/components/CursorTagPreview";
import { cursorTagClient } from "../../../../games/cursor-tag/client/cursorTagClient";
import { defaultOptions } from "../../../../games/cursor-tag/logic/cursorTagOptions";
import {
  FREEZE_DURATION_S_MIN,
  ROUND_COUNT_MAX,
  ROUND_DURATION_S_MAX,
} from "../../../../games/cursor-tag/shared/constants";
import { CURSOR_TAG_META } from "../../../../games/cursor-tag/shared/meta";
import type { CursorTagOptions } from "../../../../games/cursor-tag/shared/schemas";
import { CursorTagIcon } from "../../../assets/CursorTagIcon";
import { GameColumn } from "../../room/components/GameColumn";
import { ReadyToggle } from "../../room/components/ReadyToggle";
import { SettingsColumn } from "../../room/components/SettingsColumn";
import { StartGameButton } from "../../room/components/StartGameButton";
import { GallerySection } from "./GallerySection";

/** Every setting at a bound: no « − » for the freeze, no « + » for the rounds and their length. */
const AT_BOUNDS: CursorTagOptions = {
  chatCount: 1,
  roundCount: ROUND_COUNT_MAX,
  roundDurationS: ROUND_DURATION_S_MAX,
  freezeDurationS: FREEZE_DURATION_S_MIN,
};

/**
 * The three-column lobby, with Cursor Tag's own texts, preview and settings form. The host's form
 * and a player's share their options: a click of the host lights the value up in the player's.
 */
export function LobbySection() {
  const [options, setOptions] = useState<unknown>(defaultOptions());

  return (
    <GallerySection
      title="Lobby · jeu choisi"
      note="Le formulaire de l’hôte et celui d’un joueur partagent leurs réglages : un clic de l’hôte illumine la valeur chez le joueur."
    >
      <div className="flex items-stretch gap-6">
        <GameColumn
          icon={<CursorTagIcon />}
          preview={<CursorTagPreview />}
          name={CURSOR_TAG_META.name}
          description={CURSOR_TAG_META.description}
          scoreHint={cursorTagClient.scoreHint}
          onChange={() => undefined}
        />

        <SettingsColumn
          ready={3}
          total={4}
          action={
            <StartGameButton everyoneIsReady={false} disabled={false} onStart={() => undefined} />
          }
        >
          <CursorTagOptionsForm options={options} playerCount={4} editable onChange={setOptions} />
        </SettingsColumn>
      </div>

      <div className="flex items-stretch gap-6">
        <SettingsColumn
          ready={3}
          total={4}
          action={<ReadyToggle ready={false} onToggle={() => undefined} />}
        >
          <CursorTagOptionsForm
            options={options}
            playerCount={4}
            editable={false}
            onChange={() => undefined}
          />
        </SettingsColumn>

        <SettingsColumn
          ready={1}
          total={2}
          action={
            <StartGameButton everyoneIsReady={false} disabled={false} onStart={() => undefined} />
          }
        >
          {/* Every bound reached, with two players: one Chat at most. */}
          <CursorTagOptionsForm
            options={AT_BOUNDS}
            playerCount={2}
            editable
            onChange={() => undefined}
          />
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
