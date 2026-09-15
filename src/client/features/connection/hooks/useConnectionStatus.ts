import { useSyncExternalStore } from "react";

import { isConnected, subscribeToConnection } from "../../../services/socketClient";

/** True while the Socket.IO connection to the server is established. */
export function useConnectionStatus(): boolean {
  return useSyncExternalStore(subscribeToConnection, isConnected);
}
