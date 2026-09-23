import { useCallback } from "react";

import type { ErrorCode } from "../../../../shared/protocol";
import type { PlayerColorId } from "../../../../shared/types";
import { copyToClipboard } from "../../../services/clipboard";
import { writePreferredColor } from "../../../services/preferences";
import { buildRoomUrl } from "../../../utils/roomUrl";
import { useNotifier } from "../../notifications/hooks/useNotifier";
import { notificationOf } from "../errorMessages";
import { useRoom } from "./useRoom";

/**
 * The room, plus the actions a member takes on it. A refusal the player did not expect becomes a
 * notification, so that a click never disappears without a word (docs/design-system.md, §11.13).
 */
export function useRoomActions(code: string) {
  const { state, actions } = useRoom();
  const notify = useNotifier();

  const report = useCallback(
    (error: ErrorCode | null) => {
      if (error !== null) {
        notify("error", notificationOf(error));
      }
    },
    [notify],
  );

  return {
    state,

    actions: {
      pickColor: useCallback(
        (color: PlayerColorId) => {
          void actions.setColor(color).then((error) => {
            if (error === null) {
              writePreferredColor(color);
            }
            report(error);
          });
        },
        [actions, report],
      ),

      selectGame: useCallback(
        (gameId: string) => {
          void actions.selectGame(gameId).then(report);
        },
        [actions, report],
      ),

      setOptions: useCallback(
        (options: unknown) => {
          void actions.setOptions(options).then(report);
        },
        [actions, report],
      ),

      toggleReady: useCallback(
        (ready: boolean) => {
          void actions.setReady(ready).then(report);
        },
        [actions, report],
      ),

      start: useCallback(
        (force: boolean) => {
          void actions.start(force).then(report);
        },
        [actions, report],
      ),

      leave: actions.leave,
    },

    copyLink: useCallback(
      () => copyToClipboard(buildRoomUrl(window.location.origin, code)),
      [code],
    ),
  };
}
