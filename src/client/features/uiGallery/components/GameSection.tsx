import type { Player } from "../../../../shared/types";
import { BotPanel } from "../../devTools/components/BotPanel";
import { CaptureInvite } from "../../game/components/CaptureInvite";
import { PauseOverlay } from "../../game/components/PauseOverlay";
import { DemoArena } from "../../demo/components/DemoArena";
import { GallerySection } from "./GallerySection";

/** Three bots and a person, as the development panel lists them. */
const PLAYERS: Player[] = [
  {
    playerId: "p1",
    pseudo: "Mika",
    color: "c2",
    isHost: true,
    isBot: false,
    connected: true,
    isSpectator: false,
  },
  {
    playerId: "b1",
    pseudo: "Bot 1",
    color: "c5",
    isHost: false,
    isBot: true,
    connected: true,
    isSpectator: false,
  },
  {
    playerId: "b2",
    pseudo: "Bot 2",
    color: "c7",
    isHost: false,
    isBot: true,
    connected: true,
    isSpectator: false,
  },
];

export function GameSection() {
  return (
    <GallerySection
      title="Écran de jeu"
      note="Le voile couvre l’arène et rien d’autre : l’en-tête, et donc le bouton du son, restent cliquables. La partie continue derrière."
    >
      <div className="flex flex-col gap-2">
        <span className="t-small text-ink-secondary">
          Avant la première capture de la souris (§12)
        </span>
        <div className="relative max-w-2xl">
          <DemoArena />
          <CaptureInvite onCapture={() => undefined} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="t-small text-ink-secondary">Après une perte de capture (§11.18)</span>
        <div className="relative max-w-2xl">
          <DemoArena />
          <PauseOverlay
            warning="Ton curseur ne bouge plus."
            onResume={() => undefined}
            onLeave={() => undefined}
          />
        </div>
      </div>

      <BotPanel players={PLAYERS} onAdd={() => undefined} onRemove={() => undefined} />
    </GallerySection>
  );
}
