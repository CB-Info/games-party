import { Stepper } from "../../../client/components/ui/Stepper";
import {
  SANDBOX_CATCH_UP_MS_MAX,
  SANDBOX_CATCH_UP_MS_MIN,
  SANDBOX_CATCH_UP_MS_STEP,
  SANDBOX_DURATION_S_MAX,
  SANDBOX_DURATION_S_MIN,
  SANDBOX_DURATION_S_STEP,
  SANDBOX_SPEED_MAX,
  SANDBOX_SPEED_MIN,
  SANDBOX_SPEED_STEP,
} from "../shared/constants";
import { sandboxOptionsSchema, type SandboxOptions } from "../shared/schemas";
import type { GameOptionsFormProps } from "../../gameClient.types";

/**
 * The sandbox's settings (rules.md, §3). Options cross the registry as `unknown`, so the game
 * reads its own with its own schema — the same one the server validates with.
 *
 * The speed and the « Rattrapage » are here because they are the two values worth trying against a
 * real mouse: the first decides whether a fast movement is cut by the budget, the second whether
 * what was cut is lost or paid afterwards (docs/architecture.md, §6.5). Cursor Tag keeps the speed
 * of its `rules.md`, where it is a rule of the game and not a setting.
 *
 * The « Rattrapage » is a stepper rather than a switch: « Non » is the mode of the engine today,
 * and the other steps let several lengths be felt, with no new component for a development tool.
 */
export function SandboxOptionsForm({ options, editable, onChange }: GameOptionsFormProps) {
  const parsed = sandboxOptionsSchema.safeParse(options);
  if (!parsed.success) {
    return null;
  }

  const current: SandboxOptions = parsed.data;
  const change = (patch: Partial<SandboxOptions>): void => onChange({ ...current, ...patch });

  return (
    <>
      <Stepper
        label="Durée de la partie"
        value={`${current.durationS} s`}
        editable={editable}
        canDecrement={current.durationS > SANDBOX_DURATION_S_MIN}
        canIncrement={current.durationS < SANDBOX_DURATION_S_MAX}
        onDecrement={() => change({ durationS: current.durationS - SANDBOX_DURATION_S_STEP })}
        onIncrement={() => change({ durationS: current.durationS + SANDBOX_DURATION_S_STEP })}
      />

      <Stepper
        label="Vitesse du curseur"
        value={`${current.maxSpeed}`}
        editable={editable}
        canDecrement={current.maxSpeed > SANDBOX_SPEED_MIN}
        canIncrement={current.maxSpeed < SANDBOX_SPEED_MAX}
        onDecrement={() => change({ maxSpeed: current.maxSpeed - SANDBOX_SPEED_STEP })}
        onIncrement={() => change({ maxSpeed: current.maxSpeed + SANDBOX_SPEED_STEP })}
      />

      <Stepper
        label="Rattrapage"
        value={catchUpLabel(current.catchUpMs)}
        editable={editable}
        canDecrement={current.catchUpMs > SANDBOX_CATCH_UP_MS_MIN}
        canIncrement={current.catchUpMs < SANDBOX_CATCH_UP_MS_MAX}
        onDecrement={() => change({ catchUpMs: current.catchUpMs - SANDBOX_CATCH_UP_MS_STEP })}
        onIncrement={() => change({ catchUpMs: current.catchUpMs + SANDBOX_CATCH_UP_MS_STEP })}
      />
    </>
  );
}

/**
 * « Non », then seconds with a decimal comma. Both chosen to fit the stepper's fixed-width value
 * (docs/design-system.md, §11.5), measured in its own font: « 0,5 s » takes 43 px of the 52, where
 * « 300 ms » or « Aucun » would spill over.
 */
function catchUpLabel(catchUpMs: number): string {
  return catchUpMs === 0 ? "Non" : `${(catchUpMs / 1000).toFixed(1).replace(".", ",")} s`;
}
