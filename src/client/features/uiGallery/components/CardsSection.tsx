import { CursorTagIcon } from "../../../assets/CursorTagIcon";
import { Card } from "../../../components/ui/Card";
import { GameCard } from "../../../components/ui/GameCard";
import { GallerySection } from "./GallerySection";

const CURSOR_TAG_DESCRIPTION = "Un jeu du chat à la souris. Esquive, prends les portails.";

export function CardsSection() {
  return (
    <GallerySection
      title="Cartes"
      note="La grille remplit automatiquement à partir de 266 px, avec 24 px d’espace."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Joueurs" counter="6 / 10">
          <p className="t-body text-ink-secondary">
            Contenu de la carte. Marge intérieure 24, en-tête en titre-3, texte en corps.
          </p>
        </Card>
        <Card>
          <p className="t-body text-ink-secondary">Carte sans en-tête.</p>
        </Card>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(266px,1fr))] gap-6">
        <GameCard
          icon={<CursorTagIcon />}
          name="Cursor Tag"
          description={CURSOR_TAG_DESCRIPTION}
          playersLabel="3 à 10 joueurs"
        />
        <GameCard
          icon={<CursorTagIcon />}
          name="Cursor Tag"
          description={CURSOR_TAG_DESCRIPTION}
          playersLabel="3 à 10 joueurs"
        />
      </div>
    </GallerySection>
  );
}
