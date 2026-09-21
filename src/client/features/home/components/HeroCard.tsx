import type { ReactNode } from "react";

interface HeroCardProps {
  /** Pill, title, intro and form — or, on a refusal, the error content that replaces them (§13). */
  left: ReactNode;
  /** The arena and the game card, or the room's player list (§13). */
  aside: ReactNode;
}

/** The two-column card of the home and invitation screens (docs/design-system.md, §13). */
export function HeroCard({ left, aside }: HeroCardProps) {
  return (
    <main className="flex flex-1 items-start px-12 pb-16 wide:px-14">
      <div className="flex w-full flex-col items-start gap-10 rounded-xl border border-line bg-surface p-10 shadow-1 wide:flex-row wide:items-center wide:gap-14 wide:p-14">
        <div className="flex w-full flex-col gap-6 wide:w-[452px] wide:shrink-0">{left}</div>

        <div className="flex w-full min-w-0 flex-col gap-4 wide:w-[620px] wide:shrink-0">
          {aside}
        </div>
      </div>
    </main>
  );
}

/** Pill, title and intro: the head of the left column, shared by both screens (§13). */
export function HeroIntro({
  badge,
  title,
  intro,
}: {
  badge: ReactNode;
  title: string;
  intro: string;
}) {
  return (
    <>
      {badge}
      <h1 className="t-display">{title}</h1>
      <p className="t-body-lg text-ink-secondary">{intro}</p>
    </>
  );
}

/** The accent pill of the home screen (§13). */
export function HeroBadge({ children }: { children: string }) {
  return (
    <span className="self-start rounded-pill bg-accent-soft px-3 py-2 t-micro text-accent-hover">
      {children}
    </span>
  );
}

/** The amber pill with the blinking dot, when a game is already running (§13). */
export function HeroBadgeLive({ children }: { children: string }) {
  return (
    <span className="inline-flex self-start items-center gap-2 rounded-pill bg-warning-soft px-3 py-2 t-micro text-warning">
      <span aria-hidden="true" className="size-2 shrink-0 animate-blink rounded-pill bg-warning" />
      {children}
    </span>
  );
}
