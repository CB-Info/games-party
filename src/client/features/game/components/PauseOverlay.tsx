import { ArenaVeil } from "../../../components/ui/ArenaVeil";
import { Button } from "../../../components/ui/Button";
import { ExitIcon } from "../../../components/ui/icons/ExitIcon";

interface PauseOverlayProps {
  /** What losing the mouse costs, in this game's own words (docs/design-system.md, §11.18). */
  warning: string;
  onResume: () => void;
  onLeave: () => void;
}

/**
 * Shown when the mouse capture is lost — Escape, alt-tab (docs/architecture.md, §6.5). No input is
 * sent while it is up, so the cursor stands still for everyone else, and the game carries on
 * behind the veil: that is the whole point of the warning.
 */
export function PauseOverlay({ warning, onResume, onLeave }: PauseOverlayProps) {
  return (
    <ArenaVeil>
      <h2 className="t-title-1 text-arena-ink">Clique pour reprendre</h2>

      <span className="inline-flex items-center gap-2 rounded-pill bg-warning-soft px-3 py-2 t-body-strong text-warning">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-pill bg-warning" />
        {warning}
      </span>

      <div className="flex gap-4">
        <Button onClick={onResume}>Reprendre</Button>
        <Button variant="secondary" icon={<ExitIcon />} onClick={onLeave}>
          Quitter la room
        </Button>
      </div>
    </ArenaVeil>
  );
}
