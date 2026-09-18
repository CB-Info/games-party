import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "soft" | "danger" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Icon placed before the label, 8 px away from it (docs/design-system.md, §11.1). */
  icon?: ReactNode;
}

// 54 px tall, pill, control text, 32 px of horizontal padding (§11.1). No state may change these
// dimensions, so the hover lift is a transform and the focus ring an outer shadow.
const TALL =
  "inline-flex h-[54px] items-center justify-center gap-2 rounded-pill px-8 t-control " +
  "transition-[background-color,color,transform] duration-fast ease-fast " +
  "enabled:hover:-translate-y-px " +
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-disabled";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: `${TALL} focus-ring bg-accent text-on-accent enabled:hover:bg-accent-hover`,
  secondary: `${TALL} focus-ring border border-line bg-surface text-ink enabled:hover:border-line-strong`,
  soft: `${TALL} focus-ring bg-accent-soft text-accent-hover enabled:hover:bg-accent-soft-hover`,
  danger: `${TALL} focus-ring-danger bg-danger text-on-accent enabled:hover:bg-danger-hover`,
  // 32 px tall, 8 x 12 padding, small text, no lift on hover (§11.2).
  quiet:
    "inline-flex h-8 items-center justify-center gap-2 rounded-pill px-3 t-small focus-ring " +
    "bg-transparent text-ink-secondary transition-[background-color,color] duration-fast ease-fast " +
    "enabled:hover:bg-surface-2 enabled:hover:text-ink " +
    "disabled:cursor-not-allowed disabled:text-ink-disabled",
};

export function Button({
  variant = "primary",
  icon,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button type="button" className={`${VARIANTS[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}
