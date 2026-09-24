import { describe, expect, it } from "vitest";

import { cursorTagActionSchema, cursorTagOptionsSchema } from "./schemas";

/** Default options (rules.md, §3), of which each test changes one value. */
const VALID = { chatCount: 1, roundCount: 3, roundDurationS: 60, freezeDurationS: 3 };

describe("cursorTagOptionsSchema", () => {
  it("accepts four whole numbers, even outside their bounds", () => {
    // Bounds and steps are `normalizeOptions`' work: the schema only checks the shape.
    expect(cursorTagOptionsSchema.safeParse(VALID).success).toBe(true);
    expect(cursorTagOptionsSchema.safeParse({ ...VALID, roundDurationS: 70 }).success).toBe(true);
    expect(cursorTagOptionsSchema.safeParse({ ...VALID, chatCount: 0 }).success).toBe(true);
  });

  it("turns down a value that is missing, null or not a whole number", () => {
    const withoutChatCount = { roundCount: 3, roundDurationS: 60, freezeDurationS: 3 };

    expect(cursorTagOptionsSchema.safeParse(withoutChatCount).success).toBe(false);
    expect(cursorTagOptionsSchema.safeParse({ ...VALID, roundCount: null }).success).toBe(false);
    expect(cursorTagOptionsSchema.safeParse({ ...VALID, freezeDurationS: 2.5 }).success).toBe(
      false,
    );
    expect(cursorTagOptionsSchema.safeParse({ ...VALID, roundDurationS: "60" }).success).toBe(
      false,
    );
  });

  it("turns down a key it does not know", () => {
    expect(cursorTagOptionsSchema.safeParse({ ...VALID, speed: 2000 }).success).toBe(false);
  });
});

describe("cursorTagActionSchema", () => {
  it("accepts the two actions of the preparation", () => {
    expect(cursorTagActionSchema.parse({ type: "ready" })).toEqual({ type: "ready" });
    expect(cursorTagActionSchema.parse({ type: "notReady" })).toEqual({ type: "notReady" });
  });

  it("turns down any other type, and a missing one", () => {
    expect(cursorTagActionSchema.safeParse({ type: "tag" }).success).toBe(false);
    expect(cursorTagActionSchema.safeParse({}).success).toBe(false);
  });

  it("turns down an action carrying anything more than its type", () => {
    // A player never names who is ready: the server takes it from the session (règle d'or 1).
    expect(cursorTagActionSchema.safeParse({ type: "ready", playerId: "p1" }).success).toBe(false);
  });
});
