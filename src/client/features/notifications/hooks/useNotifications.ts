import { useCallback, useEffect, useRef, useState } from "react";

import { NOTIFICATION_DURATION_MS } from "../../../../shared/constants";
import type { NotificationTone } from "../../../components/ui/Notification";

export interface AppNotification {
  id: number;
  tone: NotificationTone;
  text: string;
  /** A notification that reports a state stays until it is cleared by hand (architecture §10). */
  persistent: boolean;
}

let nextId = 0;

export interface NotificationsApi {
  notifications: AppNotification[];
  notify: (tone: NotificationTone, text: string) => void;
  /** Shows a notification that stays until `clearPersistent` is called. */
  showPersistent: (tone: NotificationTone, text: string) => void;
  clearPersistent: () => void;
}

/** The notification queue: each one disappears after four seconds (docs/design-system.md, §11.13). */
export function useNotifications(): NotificationsApi {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) {
        clearTimeout(timer);
      }
    },
    [],
  );

  const remove = useCallback((id: number) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const notify = useCallback(
    (tone: NotificationTone, text: string) => {
      nextId += 1;
      const id = nextId;

      setNotifications((current) => [...current, { id, tone, text, persistent: false }]);
      timers.current.push(setTimeout(() => remove(id), NOTIFICATION_DURATION_MS));
    },
    [remove],
  );

  const showPersistent = useCallback((tone: NotificationTone, text: string) => {
    nextId += 1;

    setNotifications((current) => [
      ...current.filter((notification) => !notification.persistent),
      { id: nextId, tone, text, persistent: true },
    ]);
  }, []);

  const clearPersistent = useCallback(() => {
    setNotifications((current) => current.filter((notification) => !notification.persistent));
  }, []);

  return { notifications, notify, showPersistent, clearPersistent };
}
