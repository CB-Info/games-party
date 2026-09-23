import { z } from "zod";

import { cursorInputSchema, type CursorInput } from "../../../shared/cursor/cursorInput";
import { defineGame, type RegisteredGame } from "../../defineGame";
import {
  SANDBOX_DURATION_S_DEFAULT,
  SANDBOX_DURATION_S_MAX,
  SANDBOX_DURATION_S_MIN,
  SANDBOX_DURATION_S_STEP,
  SANDBOX_SPEED_DEFAULT,
  SANDBOX_SPEED_MAX,
  SANDBOX_SPEED_MIN,
  SANDBOX_SPEED_STEP,
} from "../shared/constants";
import { SANDBOX_META } from "../shared/meta";
import { sandboxOptionsSchema, type SandboxOptions } from "../shared/schemas";
import type { SandboxView } from "../shared/types";
import { SandboxGame } from "./SandboxGame";
import { sandboxBot } from "./bot";

/** Brings a value back inside its bounds and onto a valid step, as every game's options are (§5.3). */
function onStep(value: number, min: number, max: number, step: number): number {
  const bounded = Math.min(max, Math.max(min, value));
  return min + Math.round((bounded - min) / step) * step;
}

/** The sandbox, as the registry holds it. Never listed in a production build (§8). */
export const sandboxGame: RegisteredGame = defineGame<
  CursorInput,
  never,
  SandboxView,
  SandboxOptions
>({
  meta: SANDBOX_META,
  inputSchema: cursorInputSchema,
  // No action: a player only moves their cursor.
  actionSchema: z.never(),
  optionsSchema: sandboxOptionsSchema,
  defaultOptions: () => ({
    durationS: SANDBOX_DURATION_S_DEFAULT,
    maxSpeed: SANDBOX_SPEED_DEFAULT,
  }),
  normalizeOptions: (options) => ({
    durationS: onStep(
      options.durationS,
      SANDBOX_DURATION_S_MIN,
      SANDBOX_DURATION_S_MAX,
      SANDBOX_DURATION_S_STEP,
    ),
    maxSpeed: onStep(options.maxSpeed, SANDBOX_SPEED_MIN, SANDBOX_SPEED_MAX, SANDBOX_SPEED_STEP),
  }),
  create: (ctx, options) => new SandboxGame(ctx, options),
  bot: sandboxBot,
});
