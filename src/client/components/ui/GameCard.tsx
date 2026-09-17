import type { ReactNode } from "react";

import { Badge } from "./Badge";

interface GameCardProps {
  /** The game mark, sized by its own component (docs/design-system.md, §11.7). */
  icon: ReactNode;
  name: string;
  description: string;
  /** For instance "3 à 10 joueurs". */
  playersLabel: string;
  onSelect?: () => void;
}

/** One card per existing game in the "Choisis un jeu" grid (docs/design-system.md, §11.7). */
export function GameCard({ icon, name, description, playersLabel, onSelect }: GameCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="focus-ring flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-6 text-left transition-[border-color] duration-standard ease-standard hover:border-line-strong hover:shadow-2"
    >
      {icon}
      <span className="t-title-3">{name}</span>
      <span className="t-body text-ink-secondary">{description}</span>
      <Badge variant="playerCount">{playersLabel}</Badge>
    </button>
  );
}
