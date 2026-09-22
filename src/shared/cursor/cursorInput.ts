import { z } from "zod";

import { MAX_INPUT_DELTA } from "../constants";

/**
 * What a cursor game receives from a player, thirty times a second (docs/architecture.md, §6.5).
 * `seq` grows by one per message, restarts at 0 at the start of a game and after a reconnection,
 * and lets the server drop anything it has already applied.
 */
export const cursorInputSchema = z.strictObject({
  seq: z.number().int().min(0),
  dx: z.number().finite().min(-MAX_INPUT_DELTA).max(MAX_INPUT_DELTA),
  dy: z.number().finite().min(-MAX_INPUT_DELTA).max(MAX_INPUT_DELTA),
});

export type CursorInput = z.infer<typeof cursorInputSchema>;

/** The value a player's `lastProcessedSeq` takes before their first input, and after a reconnection. */
export const NO_SEQ_PROCESSED = -1;

/** True when this input has not been applied yet. Anything older is ignored (§6.5). */
export function isNewInput(input: CursorInput, lastProcessedSeq: number): boolean {
  return input.seq > lastProcessedSeq;
}
