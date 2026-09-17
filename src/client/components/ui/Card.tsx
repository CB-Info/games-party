import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  /** Counter aligned to the right of the header, for instance "6 / 10". */
  counter?: string;
  children: ReactNode;
  className?: string;
}

/** Surface panel of the lobby and the results (docs/design-system.md, §11.6). */
export function Card({ title, counter, children, className = "" }: CardProps) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-1 ${className}`}
    >
      {title === undefined ? null : (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="t-title-3">{title}</h2>
          {counter === undefined ? null : (
            <span className="t-small text-ink-secondary">{counter}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
