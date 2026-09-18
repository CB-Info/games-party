import { GallerySection } from "./GallerySection";

const INTERFACE_COLORS = [
  ["bg-page", "Fond"],
  ["bg-surface", "Surface"],
  ["bg-surface-2", "Surface 2"],
  ["bg-ink", "Texte"],
  ["bg-ink-secondary", "Texte secondaire"],
  ["bg-ink-disabled", "Texte désactivé"],
  ["bg-line", "Bordure"],
  ["bg-line-strong", "Bordure forte"],
  ["bg-accent", "Accent"],
  ["bg-accent-hover", "Accent survol"],
  ["bg-accent-soft", "Accent doux"],
  ["bg-accent-soft-hover", "Accent doux survol"],
  ["bg-success", "Succès"],
  ["bg-warning", "Avertissement"],
  ["bg-warning-soft", "Avertissement doux"],
  ["bg-danger", "Erreur"],
  ["bg-danger-hover", "Erreur survol"],
  ["bg-danger-soft", "Erreur doux"],
  ["bg-cursor-tag", "Jeu · Cursor Tag"],
  ["bg-cursor-tag-soft", "Jeu doux"],
  ["bg-on-accent", "Texte sur accent"],
  ["bg-window-veil", "Voile de fenêtre"],
];

const ARENA_COLORS = [
  ["bg-arena", "Arène fond"],
  ["bg-arena-wall", "Arène mur"],
  ["bg-arena-veil", "Arène voile"],
  ["bg-arena-label", "Arène étiquette"],
  ["bg-arena-ink", "Arène texte"],
  ["bg-arena-ink-secondary", "Arène texte secondaire"],
  ["bg-portal", "Portail"],
  ["bg-freeze-fill", "Gel remplissage"],
  ["bg-freeze-ring", "Gel anneau"],
  ["bg-freeze-halo", "Gel halo"],
  ["bg-freeze-ink", "Gel encre"],
];

const PLAYER_COLORS = [
  ["bg-player-1", "c1 rouge"],
  ["bg-player-2", "c2 rose"],
  ["bg-player-3", "c3 violet"],
  ["bg-player-4", "c4 indigo"],
  ["bg-player-5", "c5 bleu"],
  ["bg-player-6", "c6 cyan"],
  ["bg-player-7", "c7 menthe"],
  ["bg-player-8", "c8 lime"],
  ["bg-player-9", "c9 jaune"],
  ["bg-player-10", "c10 orange"],
];

const TEXT_STYLES = [
  ["t-display", "affiche · titre-1 sous le seuil wide"],
  ["t-title-1", "titre-1"],
  ["t-title-2", "titre-2"],
  ["t-title-3", "titre-3"],
  ["t-body-lg", "corps-l"],
  ["t-body", "corps"],
  ["t-body-strong", "corps-fort"],
  ["t-control", "contrôle 600"],
  ["t-input", "contrôle 500"],
  ["t-small", "petit"],
  ["t-micro", "micro"],
  ["t-label", "micro sans capitales"],
  ["t-timer", "chrono"],
  ["t-logo", "logo"],
];

const RADII = [
  ["rounded-xs", "xs · 8"],
  ["rounded-sm", "sm · 12"],
  ["rounded-md", "md · 16"],
  ["rounded-lg", "lg · 20"],
  ["rounded-xl", "xl · 24"],
  ["rounded-pill", "pilule"],
];

const SHADOWS = [
  ["shadow-1", "ombre-1"],
  ["shadow-2", "ombre-2"],
  ["shadow-3", "ombre-3"],
];

function Swatches({ entries }: { entries: string[][] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {entries.map(([className, label]) => (
        <div key={label} className="flex w-36 flex-col gap-1">
          <div className={`h-10 rounded-sm border border-line ${className ?? ""}`} />
          <span className="t-small text-ink-secondary">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function TokensSection() {
  return (
    <GallerySection
      title="Tokens"
      note="Élargis la fenêtre au-delà de 1440 × 850 : seuls t-display, t-countdown et t-logo changent de taille."
    >
      <h3 className="t-title-3">Couleurs de l’interface</h3>
      <Swatches entries={INTERFACE_COLORS} />
      <h3 className="t-title-3">Couleurs de l’arène</h3>
      <Swatches entries={ARENA_COLORS} />
      <h3 className="t-title-3">Couleurs des joueurs</h3>
      <Swatches entries={PLAYER_COLORS} />

      <h3 className="t-title-3">Typographie</h3>
      <div className="flex flex-col gap-3">
        {TEXT_STYLES.map(([className, label]) => (
          <div key={label} className="flex items-baseline gap-4">
            <span className="w-44 shrink-0 t-small text-ink-secondary">{label}</span>
            <span className={className}>Attrape un Coureur</span>
          </div>
        ))}
        <div className="flex items-baseline gap-4">
          <span className="w-44 shrink-0 t-small text-ink-secondary">compte à rebours</span>
          <span className="t-countdown">3</span>
        </div>
      </div>

      <h3 className="t-title-3">Rayons</h3>
      <Swatches entries={RADII} />
      <h3 className="t-title-3">Ombres</h3>
      <div className="flex flex-wrap gap-6 p-3">
        {SHADOWS.map(([className, label]) => (
          <div key={label} className="flex w-36 flex-col gap-2">
            <div className={`h-16 rounded-md bg-surface ${className ?? ""}`} />
            <span className="t-small text-ink-secondary">{label}</span>
          </div>
        ))}
      </div>
    </GallerySection>
  );
}
