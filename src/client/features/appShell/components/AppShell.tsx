import type { ReactNode } from "react";

import { useHasMouse } from "../../../hooks/usePointerCapability";
import { NotificationHost } from "../../notifications/components/NotificationHost";
import { NotificationsContext } from "../../notifications/notificationsContext";
import { useConnectionNotification } from "../../notifications/hooks/useConnectionNotification";
import { useNotifications } from "../../notifications/hooks/useNotifications";
import { useSession } from "../../session/hooks/useSession";
import { useSoundPreference } from "../../sound/hooks/useSoundPreference";
import { AppHeader } from "./AppHeader";
import { NoMouseMessage } from "./NoMouseMessage";
import { ReplacedMessage } from "./ReplacedMessage";

/**
 * The frame every screen sits in: the header, then the content straight below it, never centred
 * vertically (docs/design-system.md, §13).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const hasMouse = useHasMouse();
  const { replaced } = useSession();
  const sound = useSoundPreference();
  const notifications = useNotifications();

  useConnectionNotification(notifications, replaced);

  return (
    <NotificationsContext value={notifications.notify}>
      <div className="flex min-h-dvh flex-col">
        <AppHeader soundEnabled={sound.enabled} onToggleSound={sound.toggle} />
        <NotificationHost notifications={notifications.notifications} />
        {shellContent(hasMouse, replaced, children)}
      </div>
    </NotificationsContext>
  );
}

/** Both messages replace the content rather than sitting on top of it (§2 and §4). */
function shellContent(hasMouse: boolean, replaced: boolean, children: ReactNode): ReactNode {
  if (hasMouse && !replaced) {
    return children;
  }

  return (
    <main className="flex flex-1 items-start px-12 pb-10 wide:px-14">
      {hasMouse ? <ReplacedMessage /> : <NoMouseMessage />}
    </main>
  );
}
