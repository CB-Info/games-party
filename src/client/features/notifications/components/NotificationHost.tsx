import { Notification } from "../../../components/ui/Notification";
import type { AppNotification } from "../hooks/useNotifications";

/** The notification stack, centred at the top of the screen (docs/design-system.md, §11.13). */
export function NotificationHost({ notifications }: { notifications: AppNotification[] }) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-6 z-10 flex flex-col items-center gap-2"
    >
      {notifications.map((notification) => (
        <Notification key={notification.id} tone={notification.tone}>
          {notification.text}
        </Notification>
      ))}
    </div>
  );
}
