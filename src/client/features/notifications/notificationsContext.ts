import { createContext } from "react";

import type { NotificationTone } from "../../components/ui/Notification";

/** Reports something the player should see, for four seconds (docs/design-system.md, §11.13). */
export type Notify = (tone: NotificationTone, text: string) => void;

// The default does nothing: a screen rendered outside the shell simply reports nowhere.
export const NotificationsContext = createContext<Notify>(() => {});
