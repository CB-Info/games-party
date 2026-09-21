import { ReadyToggleButton } from "../../../components/ui/ReadyToggleButton";

interface ReadyToggleProps {
  ready: boolean;
  onToggle: (ready: boolean) => void;
}

const CANCEL_HINT = "Clique à nouveau pour annuler";

/** The toggle and its hint, which only shows once you are ready (docs/design-system.md, §11.3). */
export function ReadyToggle({ ready, onToggle }: ReadyToggleProps) {
  return (
    <div className="flex flex-col items-stretch gap-2">
      <ReadyToggleButton ready={ready} onToggle={() => onToggle(!ready)} />
      {ready ? <span className="text-center t-small text-ink-secondary">{CANCEL_HINT}</span> : null}
    </div>
  );
}
