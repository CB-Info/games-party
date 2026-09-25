import { Stepper } from "../../../../client/components/ui/Stepper";
import type { GameOptionsFormProps } from "../../../gameClient.types";
import { chatCountMax } from "../../logic/cursorTagOptions";
import {
  CHAT_COUNT_MIN,
  CHAT_COUNT_STEP,
  FREEZE_DURATION_S_MAX,
  FREEZE_DURATION_S_MIN,
  FREEZE_DURATION_S_STEP,
  ROUND_COUNT_MAX,
  ROUND_COUNT_MIN,
  ROUND_COUNT_STEP,
  ROUND_DURATION_S_MAX,
  ROUND_DURATION_S_MIN,
  ROUND_DURATION_S_STEP,
} from "../../shared/constants";
import { cursorTagOptionsSchema, type CursorTagOptions } from "../../shared/schemas";
import { useOptionHighlight } from "../hooks/useOptionHighlight";

interface Setting {
  key: keyof CursorTagOptions;
  label: string;
  /** The unit goes in the value, as the stepper shows it: « 60 s » (docs/design-system.md, §11.5). */
  unit: string;
  min: number;
  max: number;
  step: number;
}

/**
 * Cursor Tag's four settings (rules.md, §3). Options cross the registry as `unknown`, so the game
 * reads its own with its own schema — the same one the server validates with. A bound reached
 * disables its button; the server brings back anything else (§3, `normalizeOptions`). In a
 * player's form, a value the host has just changed lights up.
 */
export function CursorTagOptionsForm({
  options,
  playerCount,
  editable,
  onChange,
}: GameOptionsFormProps) {
  const parsed = cursorTagOptionsSchema.safeParse(options);
  const current = parsed.success ? parsed.data : null;
  const changes = useOptionHighlight(current);
  if (current === null) {
    return null;
  }

  const settings: Setting[] = [
    {
      key: "chatCount",
      label: "Nombre de Chats",
      unit: "",
      min: CHAT_COUNT_MIN,
      max: chatCountMax(playerCount),
      step: CHAT_COUNT_STEP,
    },
    {
      key: "roundCount",
      label: "Nombre de manches",
      unit: "",
      min: ROUND_COUNT_MIN,
      max: ROUND_COUNT_MAX,
      step: ROUND_COUNT_STEP,
    },
    {
      key: "roundDurationS",
      label: "Durée d’une manche",
      unit: " s",
      min: ROUND_DURATION_S_MIN,
      max: ROUND_DURATION_S_MAX,
      step: ROUND_DURATION_S_STEP,
    },
    {
      key: "freezeDurationS",
      label: "Durée du gel",
      unit: " s",
      min: FREEZE_DURATION_S_MIN,
      max: FREEZE_DURATION_S_MAX,
      step: FREEZE_DURATION_S_STEP,
    },
  ];

  return (
    <>
      {settings.map(({ key, label, unit, min, max, step }) => {
        const value = current[key];
        const changed = changes[key] ?? 0;

        return (
          <Stepper
            // In a player's form, a new key replays the highlight at every change the host makes.
            // Never in the host's: remounting the row would take the focus off the button just
            // pressed.
            key={editable ? key : `${key}-${changed}`}
            label={label}
            value={`${value}${unit}`}
            editable={editable}
            canDecrement={value > min}
            canIncrement={value < max}
            onDecrement={() => onChange({ ...current, [key]: value - step })}
            onIncrement={() => onChange({ ...current, [key]: value + step })}
            highlighted={changed > 0}
          />
        );
      })}
    </>
  );
}
