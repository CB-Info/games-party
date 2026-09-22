import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { CursorTagIcon } from "../../../assets/CursorTagIcon";
import { DemoArena } from "../../demo/components/DemoArena";

interface GameColumnProps {
  name: string;
  description: string;
  /** The sentence the game contributes, for instance its scoring rule (§13). */
  scoreHint: string;
  /** Only the host may change the game (docs/architecture.md, §5.3). */
  onChange?: () => void;
}

/** The "Le jeu" column: the chosen game, the arena and the game's own sentence (§13). */
export function GameColumn({ name, description, scoreHint, onChange }: GameColumnProps) {
  return (
    <Card className="flex-1">
      <div className="flex items-center gap-4">
        <CursorTagIcon />
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

      <DemoArena />
      <p className="t-body text-ink-secondary">{scoreHint}</p>
    </Card>
  );
}
