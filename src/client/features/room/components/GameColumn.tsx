import type { ReactNode } from "react";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";

interface GameColumnProps {
  /** The game's own 48 px mark (docs/design-system.md, §11.7). */
  icon: ReactNode;
  /** The still picture of the arena the game supplies (§13). */
  preview: ReactNode;
  name: string;
  description: string;
  /** The sentence the game contributes, for instance its scoring rule (§13). */
  scoreHint: string;
  /** Only the host may change the game (docs/architecture.md, §5.3). */
  onChange?: () => void;
}

/** The "Le jeu" column: the chosen game, the arena and the game's own sentence (§13). */
export function GameColumn({
  icon,
  preview,
  name,
  description,
  scoreHint,
  onChange,
}: GameColumnProps) {
  return (
    <Card className="flex-1">
      <div className="flex items-center gap-4">
        {icon}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="t-title-2">{name}</span>
          <span className="t-body text-ink-secondary">{description}</span>
        </div>
        {onChange === undefined ? null : (
          <Button variant="secondary" onClick={onChange}>
            Changer
          </Button>
        )}
      </div>

      {preview}
      <p className="t-body text-ink-secondary">{scoreHint}</p>
    </Card>
  );
}
