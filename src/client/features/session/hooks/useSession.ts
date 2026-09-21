import { useSyncExternalStore } from "react";

import { sessionIdentity } from "../../../services/sessionIdentity";
import { isSessionReplaced, subscribeToSessionReplaced } from "../../../services/socketClient";

export interface SessionState {
  /** Null until the server has answered with this browser's identity. */
  playerId: string | null;
  /** True once this session has been opened in another tab (docs/architecture.md, §4). */
  replaced: boolean;
}

/**
 * This browser's identity, as the server hands it out on every connection (§4). Both values are
 * read as snapshots rather than collected by an effect: `session:init` arrives once per connection,
 * long before the lobby mounts, and an effect subscribing afterwards would never see it.
 */
export function useSession(): SessionState {
  const identity = useSyncExternalStore(sessionIdentity.subscribe, sessionIdentity.get);
  const replaced = useSyncExternalStore(subscribeToSessionReplaced, isSessionReplaced);

  return { playerId: identity?.playerId ?? null, replaced };
}
