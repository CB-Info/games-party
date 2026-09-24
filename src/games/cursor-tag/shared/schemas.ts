import { z } from "zod";

/**
 * The options of Cursor Tag (rules.md, §3), as the host sends them. Whole numbers only: bounds and
 * steps are brought back by `normalizeOptions`, because the upper bound of `chatCount` depends on
 * the number of players, which a schema does not know.
 */
export const cursorTagOptionsSchema = z.strictObject({
  chatCount: z.number().int(),
  roundCount: z.number().int(),
  roundDurationS: z.number().int(),
  freezeDurationS: z.number().int(),
});

export type CursorTagOptions = z.infer<typeof cursorTagOptionsSchema>;

/** The two actions of the preparation (rules.md, §10): a player is ready, or no longer is. */
export const cursorTagActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("ready") }),
  z.strictObject({ type: z.literal("notReady") }),
]);

export type CursorTagAction = z.infer<typeof cursorTagActionSchema>;
