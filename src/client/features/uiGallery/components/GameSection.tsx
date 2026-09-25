import { ArenaScene } from "../../../../games/cursor-tag/client/components/ArenaScene";
import { pauseWarningFor } from "../../../../games/cursor-tag/client/pauseWarning";
import type { Player } from "../../../../shared/types";
import { BotPanel } from "../../devTools/components/BotPanel";
import { CaptureInvite } from "../../game/components/CaptureInvite";
import { PauseOverlay } from "../../game/components/PauseOverlay";
import { DemoArena } from "../../demo/components/DemoArena";
import { GallerySection } from "./GallerySection";
import {
  AS_CHAT,
  AS_FROZEN_CHAT,
  AS_RUNNER,
  AS_SPECTATOR,
  PREPARATION,
  REDUCED_MOTION,
} from "./tagScenes";

/** Every state of Cursor Tag's arena, drawn by the game's own renderer (§12). */
const TAG_SCENES = [
  ["Tu cours : Pixel chasse, Zippy est gelé, ta paire B se recharge", AS_RUNNER],
  ["Tu es le Chat", AS_CHAT],
  ["Tu es le Chat, gelé", AS_FROZEN_CHAT],
  ["Un spectateur : aucun anneau, aucune recharge", AS_SPECTATOR],
  ["La préparation : aucun curseur, aucune pulsation", PREPARATION],
  ["Animations réduites : rien ne pulse, la recharge se voit", REDUCED_MOTION],
] as const;

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

      {TAG_SCENES.map(([caption, scene]) => (
        <div key={caption} className="flex flex-col gap-2">
          <span className="t-small text-ink-secondary">Cursor Tag · {caption}</span>
          <div className="max-w-2xl">
            <ArenaScene scene={scene} />
          </div>
        </div>
      ))}

      {(["runner", "chat"] as const).map((role) => (
        <div key={role} className="flex flex-col gap-2">
          <span className="t-small text-ink-secondary">
            Cursor Tag · perte de capture, en {role === "chat" ? "Chat" : "Coureur"} (§11.18)
          </span>
          <div className="relative max-w-2xl">
            <ArenaScene scene={role === "chat" ? AS_CHAT : AS_RUNNER} />
            <PauseOverlay
              warning={pauseWarningFor(role)}
              onResume={() => undefined}
              onLeave={() => undefined}
            />
          </div>
        </div>
      ))}

      <BotPanel players={PLAYERS} onAdd={() => undefined} onRemove={() => undefined} />
    </GallerySection>
  );
}
