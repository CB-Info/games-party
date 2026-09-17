import { useId } from "react";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  /** Message shown under the field; the field turns to the error style when set. */
  error?: string;
  /** Help shown under the field when there is no error. */
  hint?: string;
  disabled?: boolean;
}

/** Pill shaped field of 54 px with its optional character counter (docs/design-system.md, §11.4). */
export function TextField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  error,
  hint,
  disabled,
}: TextFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const border = error ? "border-danger" : "border-line hover:border-line-strong";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="t-body-strong">
        {label}
      </label>

      <div className="relative flex">
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error !== undefined}
          aria-describedby={(error ?? hint) ? messageId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`focus-ring h-[54px] min-w-0 flex-1 rounded-pill border bg-surface px-6 t-input text-ink transition-[border-color] duration-fast ease-fast outline-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-disabled ${border} ${maxLength === undefined ? "" : "pr-18"}`}
        />
        {maxLength === undefined ? null : (
          <span className="pointer-events-none absolute inset-y-0 right-6 flex items-center t-small text-ink-secondary">
            {value.length} / {maxLength}
          </span>
        )}
      </div>

      {error === undefined ? null : (
        <span id={messageId} className="flex items-center gap-2 t-small text-danger">
          <span className="size-2 shrink-0 rounded-pill bg-danger" />
          {error}
        </span>
      )}
      {error === undefined && hint !== undefined ? (
        <span id={messageId} className="t-small text-ink-secondary">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
