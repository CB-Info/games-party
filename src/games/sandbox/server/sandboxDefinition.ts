import { z } from "zod";

import { cursorInputSchema, type CursorInput } from "../../../shared/cursor/cursorInput";
import { defineGame, type RegisteredGame } from "../../defineGame";
import {
  SANDBOX_DURATION_S_DEFAULT,
  SANDBOX_DURATION_S_MAX,
  SANDBOX_DURATION_S_MIN,
  SANDBOX_DURATION_S_STEP,
} from "../shared/constants";
import { SANDBOX_META } from "../shared/meta";
import { sandboxOptionsSchema, type SandboxOptions } from "../shared/schemas";
import type { SandboxView } from "../shared/types";
import { SandboxGame } from "./SandboxGame";
import { sandboxBot } from "./bot";

/** Brings the duration back onto a valid step, the way every game's options are (§5.3). */
function normalizeDuration(durationS: number): number {
  const bounded = Math.min(SANDBOX_DURATION_S_MAX, Math.max(SANDBOX_DURATION_S_MIN, durationS));
  const steps = Math.round((bounded - SANDBOX_DURATION_S_MIN) / SANDBOX_DURATION_S_STEP);

  return SANDBOX_DURATION_S_MIN + steps * SANDBOX_DURATION_S_STEP;
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
  defaultOptions: () => ({ durationS: SANDBOX_DURATION_S_DEFAULT }),
  normalizeOptions: (options) => ({ durationS: normalizeDuration(options.durationS) }),
  create: (ctx, options) => new SandboxGame(ctx, options),
  bot: sandboxBot,
});
