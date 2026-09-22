import { Card } from "../../../components/ui/Card";

interface GameGridProps {
  /** One card per existing game, never a "Bientôt" card (docs/design-system.md, §11.7). */
  children?: React.ReactNode;
  isEmpty: boolean;
}

/** The host's game chooser (docs/design-system.md, §11.7 and §13). */
export function GameGrid({ children, isEmpty }: GameGridProps) {
  return (
    <Card title="Choisis un jeu" className="flex-1">
      {isEmpty ? (
        // No game is registered before step 4; this sentence goes away on its own then.
        <p className="t-body text-ink-secondary">Aucun jeu n’est disponible pour l’instant.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(266px,1fr))] gap-6">{children}</div>
      )}
    </Card>
  );
}
