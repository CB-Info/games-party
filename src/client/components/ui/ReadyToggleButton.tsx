import { CheckIcon } from "./icons/CheckIcon";

const NOT_READY_LABEL = "Je suis prêt";
const READY_LABEL = "Tu es prêt";

interface ReadyToggleButtonProps {
  ready: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// Both labels are always laid out on top of each other, so the button keeps the width of the
// longest one whatever its state (docs/design-system.md, §11.1).
const CELL = "col-start-1 row-start-1 flex items-center justify-center gap-2";

/** Toggle of the lobby and of the preparation phase (docs/design-system.md, §11.3). */
export function ReadyToggleButton({ ready, onToggle, disabled }: ReadyToggleButtonProps) {
  const skin = ready
    ? "border border-accent bg-accent-soft text-accent-hover"
    : "bg-accent text-on-accent enabled:hover:bg-accent-hover";

  return (
    <button
      type="button"
      aria-pressed={ready}
      disabled={disabled}
      onClick={onToggle}
      className={`focus-ring inline-flex h-[54px] items-center justify-center rounded-pill px-8 t-control transition-[background-color,color,transform] duration-fast ease-fast enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:border-none disabled:bg-surface-2 disabled:text-ink-disabled ${skin}`}
    >
      <span className="grid">
        <span className={`${CELL} invisible`}>{NOT_READY_LABEL}</span>
        <span className={`${CELL} invisible`}>
          <CheckIcon />
          {READY_LABEL}
        </span>
        <span className={CELL}>
          {ready ? <CheckIcon /> : null}
          {ready ? READY_LABEL : NOT_READY_LABEL}
        </span>
      </span>
    </button>
  );
}
