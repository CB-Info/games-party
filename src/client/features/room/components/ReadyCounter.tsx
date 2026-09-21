import { formatReadyCounter } from "../../../utils/readyCounter";

interface ReadyCounterProps {
  ready: number;
  total: number;
}

/** "3 joueurs sur 4 prêts", in Accent hover once everyone is ready (§11.12). */
export function ReadyCounter({ ready, total }: ReadyCounterProps) {
  const everyoneIsReady = total > 0 && ready === total;

  return (
    <p className={`t-small ${everyoneIsReady ? "text-accent-hover" : "text-ink-secondary"}`}>
      {formatReadyCounter(ready, total)}
    </p>
  );
}
