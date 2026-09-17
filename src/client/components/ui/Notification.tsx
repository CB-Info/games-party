import type { ReactNode } from "react";

export type NotificationTone = "success" | "warning" | "error";

interface NotificationProps {
  tone: NotificationTone;
  children: ReactNode;
}

/** 8 px dot, coloured after the message (docs/design-system.md, §11.13). */
const DOTS: Record<NotificationTone, string> = {
  success: "bg-accent",
  warning: "bg-warning",
  error: "bg-danger",
};

/** Centred at the top of the screen, gone after 4 s (docs/design-system.md, §11.13). */
export function Notification({ tone, children }: NotificationProps) {
  return (
    <div
      role="status"
      className="flex animate-appear items-center gap-3 rounded-md border border-line bg-surface p-4 t-body shadow-3"
    >
      <span className={`size-2 shrink-0 rounded-pill ${DOTS[tone]}`} />
      {children}
    </div>
  );
}
