interface WaitingMessageProps {
  /** For instance "Mika choisit un jeu…" (docs/design-system.md, §11.12). */
  children: string;
}

/** Shown to the players while the host picks a game (§11.12). */
export function WaitingMessage({ children }: WaitingMessageProps) {
  return (
    <p className="flex items-center justify-center gap-3 t-title-3 text-ink-secondary">
      <span aria-hidden="true" className="size-2 shrink-0 animate-blink rounded-pill bg-warning" />
      {children}
    </p>
  );
}
