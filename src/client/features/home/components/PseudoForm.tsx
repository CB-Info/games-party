import { PSEUDO_MAX_LENGTH } from "../../../../shared/constants";
import { isValidPseudo, normalizePseudo } from "../../../../shared/pseudo";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";

interface PseudoFormProps {
  pseudo: string;
  onPseudoChange: (pseudo: string) => void;
  submitLabel: string;
  onSubmit: () => void;
  /** Shown under the field, in place of the hint (docs/design-system.md, §11.4). */
  error?: string;
  hint: string;
  busy?: boolean;
}

/** The pseudo field and its action, shared by the home and the invitation screens (§13). */
export function PseudoForm({
  pseudo,
  onPseudoChange,
  submitLabel,
  onSubmit,
  error,
  hint,
  busy = false,
}: PseudoFormProps) {
  const ready = isValidPseudo(normalizePseudo(pseudo));

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !busy) {
          onSubmit();
        }
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <TextField
          label="Ton pseudo"
          value={pseudo}
          onChange={onPseudoChange}
          maxLength={PSEUDO_MAX_LENGTH}
          placeholder="ex. Sam"
          {...(error === undefined ? { hint } : { error })}
        />
        <Button type="submit" disabled={!ready || busy} className="mt-8">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
