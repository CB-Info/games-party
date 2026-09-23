import { useCallback } from "react";

import type { ErrorCode } from "../../../../shared/protocol";
import { addBot, removeBot } from "../../../services/gameRequests";
import { notificationOf } from "../../room/errorMessages";
import { useNotifier } from "../../notifications/hooks/useNotifier";

/**
 * Adding and removing development bots (docs/architecture.md, §8). A refusal is reported like any
 * other, so a click never disappears without a word (docs/design-system.md, §11.13).
 */
export function useBots(): { add: () => void; remove: (playerId: string) => void } {
  const notify = useNotifier();

  const report = useCallback(
    (result: { ok: true } | { ok: false; error: ErrorCode }) => {
      if (!result.ok) {
        notify("error", notificationOf(result.error));
      }
    },
    [notify],
  );

  return {
    add: useCallback(() => void addBot().then(report), [report]),
    remove: useCallback((playerId: string) => void removeBot(playerId).then(report), [report]),
  };
}
