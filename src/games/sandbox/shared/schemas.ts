import { z } from "zod";

/** The options of the sandbox (rules.md, §3): how long a game lasts, how fast a cursor may go. */
export const sandboxOptionsSchema = z.strictObject({
  durationS: z.number().int(),
  maxSpeed: z.number().int(),
});

export type SandboxOptions = z.infer<typeof sandboxOptionsSchema>;
