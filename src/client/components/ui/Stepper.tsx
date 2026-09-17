import { MinusIcon } from "./icons/MinusIcon";
import { PlusIcon } from "./icons/PlusIcon";

interface StepperProps {
  label: string;
  /** Value already formatted with its unit, for instance "60 s" (docs/design-system.md, §11.5). */
  value: string;
  /** Host view. A player only sees the value. */
  editable: boolean;
  onDecrement?: () => void;
  onIncrement?: () => void;
  canDecrement?: boolean;
  canIncrement?: boolean;
  /** Plays the highlight animation, when the host has just changed the value. */
  highlighted?: boolean;
}

const ROUND_BUTTON =
  "focus-ring inline-flex size-8 items-center justify-center rounded-pill border border-transparent " +
  "bg-surface-2 text-ink transition-[background-color,border-color] duration-fast ease-fast " +
  "enabled:hover:border-line disabled:cursor-not-allowed disabled:text-ink-disabled";

const VALUE = "w-[52px] shrink-0 text-center t-title-3 tabular-nums";

/** One settings row: label on the left, stepper on the right (docs/design-system.md, §11.5). */
export function Stepper({
  label,
  value,
  editable,
  onDecrement,
  onIncrement,
  canDecrement = true,
  canIncrement = true,
  highlighted,
}: StepperProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-page px-3 py-2">
      <span className="t-body-strong">{label}</span>

      {editable ? (
        <div className="flex shrink-0 items-center gap-2 rounded-pill border border-line bg-surface p-1">
          <button
            type="button"
            aria-label={`Diminuer : ${label}`}
            disabled={!canDecrement}
            onClick={onDecrement}
            className={ROUND_BUTTON}
          >
            <MinusIcon />
          </button>
          <span className={VALUE}>{value}</span>
          <button
            type="button"
            aria-label={`Augmenter : ${label}`}
            disabled={!canIncrement}
            onClick={onIncrement}
            className={ROUND_BUTTON}
          >
            <PlusIcon />
          </button>
        </div>
      ) : (
        <span className={`${VALUE} rounded-xs ${highlighted ? "animate-highlight" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
