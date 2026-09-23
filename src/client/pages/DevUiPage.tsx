import { BadgesSection } from "../features/uiGallery/components/BadgesSection";
import { ButtonsSection } from "../features/uiGallery/components/ButtonsSection";
import { CardsSection } from "../features/uiGallery/components/CardsSection";
import { FeedbackSection } from "../features/uiGallery/components/FeedbackSection";
import { GameSection } from "../features/uiGallery/components/GameSection";
import { FieldsSection } from "../features/uiGallery/components/FieldsSection";
import { LobbySection } from "../features/uiGallery/components/LobbySection";
import { PlayersSection } from "../features/uiGallery/components/PlayersSection";
import { IconsSection } from "../features/uiGallery/components/IconsSection";
import { TokensSection } from "../features/uiGallery/components/TokensSection";

/** Development only: compare the components with docs/maquettes/Design system.dc.html. */
export function DevUiPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="t-title-1">Design system</h1>
        <p className="t-body text-ink-secondary">
          Page de développement. Elle n’existe pas dans le site déployé.
        </p>
      </header>
      <TokensSection />
      <IconsSection />
      <ButtonsSection />
      <FieldsSection />
      <CardsSection />
      <BadgesSection />
      <PlayersSection />
      <LobbySection />
      <GameSection />
      <FeedbackSection />
    </main>
  );
}
