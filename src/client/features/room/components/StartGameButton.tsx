import { Button } from "../../../components/ui/Button";

interface StartGameButtonProps {
  /** True when every connected player but the host has declared themselves ready (§5.3). */
  everyoneIsReady: boolean;
  disabled: boolean;
  onStart: (force: boolean) => void;
}

/**
 * One button, never two: primary « Lancer la partie » when everyone is ready, secondary
 * « Lancer quand même » otherwise (docs/design-system.md, §13).
 */
export function StartGameButton({ everyoneIsReady, disabled, onStart }: StartGameButtonProps) {
  return (
    <Button
      variant={everyoneIsReady ? "primary" : "secondary"}
      disabled={disabled}
      onClick={() => onStart(!everyoneIsReady)}
    >
      {everyoneIsReady ? "Lancer la partie" : "Lancer quand même"}
    </Button>
  );
}
