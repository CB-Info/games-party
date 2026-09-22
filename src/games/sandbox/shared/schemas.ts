import { z } from "zod";

/** The only option of the sandbox: how long a game lasts (rules.md, §3). */
export const sandboxOptionsSchema = z.strictObject({
  durationS: z.number().int(),
});

export type SandboxOptions = z.infer<typeof sandboxOptionsSchema>;
