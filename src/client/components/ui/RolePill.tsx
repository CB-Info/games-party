import type { ReactNode } from "react";

export type Role = "runner" | "cat" | "frozen" | "spectator";

interface RolePillProps {
  role: Role;
  children: ReactNode;
}

const SKINS: Record<Role, string> = {
  runner: "bg-accent-soft text-accent-hover",
  cat: "bg-cursor-tag-soft text-ink",
  frozen: "bg-cursor-tag-soft text-ink",
  spectator: "bg-surface-2 text-ink",
};

/** 8 px dot, absent for the spectator (§11.9). */
const DOTS: Partial<Record<Role, string>> = {
  runner: "bg-accent",
  cat: "bg-cursor-tag",
  frozen: "bg-freeze-ink",
};

/** Only one role pill is visible at a time, in the information bar (docs/design-system.md, §11.9). */
export function RolePill({ role, children }: RolePillProps) {
  const dot = DOTS[role];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 t-body-strong ${SKINS[role]}`}
    >
      {dot === undefined ? null : <span className={`size-2 rounded-pill ${dot}`} />}
      {children}
    </span>
  );
}
