import { useEffect } from "react";

import { useConnectionStatus } from "../../connection/hooks/useConnectionStatus";
import type { NotificationsApi } from "./useNotifications";

const LOST_CONNECTION = "Connexion perdue, reconnexion…";

/**
 * Shows the connection notice while the socket is down. It is a state, not an event: it stays
 * until the connection is back (docs/architecture.md, §10). A session taken over by another tab
 * stays silent: that connection is not lost, it is finished, and its own message says so (§4).
 */
export function useConnectionNotification(
  notifications: NotificationsApi,
  sessionReplaced: boolean,
): void {
  const connected = useConnectionStatus();
  const { showPersistent, clearPersistent } = notifications;

  useEffect(() => {
    if (connected || sessionReplaced) {
      clearPersistent();
    } else {
      showPersistent("warning", LOST_CONNECTION);
    }
  }, [connected, sessionReplaced, showPersistent, clearPersistent]);
}
