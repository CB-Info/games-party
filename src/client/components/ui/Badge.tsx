import type { ReactNode } from "react";

export type BadgeVariant =
  "host" | "you" | "ready" | "cat" | "disconnected" | "disconnectedFlat" | "playerCount";

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

const SKINS: Record<BadgeVariant, string> = {
  host: "bg-accent-soft text-accent-hover",
  you: "bg-surface-2 text-ink",
  ready: "bg-accent-soft text-accent-hover",
  cat: "bg-cursor-tag-soft text-ink",
  // On a player row, itself laid on Surface 2 (§11.8).
  disconnected: "border border-line bg-surface text-ink-secondary",
  // On a ranking row, itself laid on Surface (§11.8).
  disconnectedFlat: "bg-surface-2 text-ink-secondary",
  playerCount: "bg-surface-2 text-ink",
};

/** 6 px dot, only on the two variants that carry one (§11.8). */
const DOTS: Partial<Record<BadgeVariant, string>> = {
  ready: "bg-accent",
  disconnected: "bg-ink-disabled",
};

export function Badge({ variant, children }: BadgeProps) {
  const dot = DOTS[variant];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-2 py-1 t-label ${SKINS[variant]}`}
    >
      {dot === undefined ? null : <span className={`size-1.5 rounded-pill ${dot}`} />}
      {children}
    </span>
  );
}
