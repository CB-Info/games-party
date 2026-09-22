import { useState } from "react";

import type { PlayerColorId } from "../../../../shared/types";
import { ColorPalette } from "../../room/components/ColorPalette";
import { PlayerRow, WaitingPlayerRow } from "../../room/components/PlayerRow";
import { ReadyCounter } from "../../room/components/ReadyCounter";
import { WaitingMessage } from "../../room/components/WaitingMessage";
import { GallerySection } from "./GallerySection";

const TAKEN_BY: Partial<Record<PlayerColorId, string>> = {
  c2: "Mika",
  c5: "Nova",
  c7: "Biscuit",
};

export function PlayersSection() {
  const [mine, setMine] = useState<PlayerColorId>("c7");

  return (
    <GallerySection
      title="Joueurs"
      note="Les badges Hôte et Toi restent collés au bord droit ; Prêt, Déconnecté et « C’est ce pseudo » s’insèrent à leur gauche. La palette se ferme avec Échap ou un clic en dehors ; une couleur prise est barrée. La ligne bordée d’Erreur est celle d’un pseudo refusé, sur l’écran d’invitation."
    >
      <div className="flex max-w-md flex-col gap-2">
        <PlayerRow pseudo="Mika" color="c2" isHost />
        <PlayerRow pseudo="Biscuit" color={mine} isYou ready onSwatchClick={() => undefined} />
        <PlayerRow pseudo="Zippy" color="c4" isHost isYou />
        <PlayerRow pseudo="UnPseudoVraimentTresLong" color="c5" isHost connected={false} />
        <PlayerRow pseudo="Nova" color="c5" isHost taken />
        <WaitingPlayerRow />
      </div>

      <div className="max-w-md">
        <ColorPalette takenBy={TAKEN_BY} mine={mine} onPick={setMine} onClose={() => undefined} />
      </div>

      <WaitingMessage>Mika choisit un jeu…</WaitingMessage>

      <div className="flex flex-col gap-1">
        <ReadyCounter ready={0} total={4} />
        <ReadyCounter ready={1} total={4} />
        <ReadyCounter ready={3} total={4} />
        <ReadyCounter ready={4} total={4} />
      </div>
    </GallerySection>
  );
}
