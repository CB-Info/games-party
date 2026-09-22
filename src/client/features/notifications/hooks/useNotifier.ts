import { useContext } from "react";

import { NotificationsContext, type Notify } from "../notificationsContext";

/** How any screen reports a refusal, without owning a notification stack of its own. */
export function useNotifier(): Notify {
  return useContext(NotificationsContext);
}
