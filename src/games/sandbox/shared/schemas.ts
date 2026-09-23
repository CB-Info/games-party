import { z } from "zod";

/**
 * The options of the sandbox (§3): how long a game lasts, how fast a cursor may go, and how long
 * it may keep catching up once the hand has stopped.
 */
export const sandboxOptionsSchema = z.strictObject({
  durationS: z.number().int(),
  maxSpeed: z.number().int(),
  catchUpMs: z.number().int(),
});

export type SandboxOptions = z.infer<typeof sandboxOptionsSchema>;
