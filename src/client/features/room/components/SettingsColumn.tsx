import type { ReactNode } from "react";

import { Card } from "../../../components/ui/Card";
import { ReadyCounter } from "./ReadyCounter";

interface SettingsColumnProps {
  /** The game's own options form (docs/architecture.md, §7). Absent while no game is chosen. */
  children?: ReactNode;
  ready: number;
  total: number;
  /** The host's launch button, or the player's ready toggle (docs/design-system.md, §13). */
  action: ReactNode;
  /** Why the launch is refused, shown under a disabled button (§1, accessibilité). */
  blockedReason?: string;
}

/** The "Réglages" column: the game's settings, then the counter and the action button (§13). */
export function SettingsColumn({
  children,
  ready,
  total,
  action,
  blockedReason,
}: SettingsColumnProps) {
  return (
    <Card title="Réglages" className="w-[396px] shrink-0">
      <div className="flex flex-1 flex-col gap-2">{children}</div>

      <div className="flex flex-col gap-3">
        <ReadyCounter ready={ready} total={total} />
        {action}

        {blockedReason === undefined ? null : (
          <p className="flex items-start gap-2 t-small text-warning">
            <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-pill bg-warning" />
            {blockedReason}
          </p>
        )}
      </div>
    </Card>
  );
}
