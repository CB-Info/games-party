import { CaptureInvite } from "../../game/components/CaptureInvite";
import { PauseOverlay } from "../../game/components/PauseOverlay";
import { DemoArena } from "../../demo/components/DemoArena";
import { GallerySection } from "./GallerySection";

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
    </GallerySection>
  );
}
