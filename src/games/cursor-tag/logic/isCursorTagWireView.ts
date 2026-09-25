import type { CursorTagWireView } from "../shared/types";

/**
 * True when a view received is Cursor Tag's compact view (rules.md, §8.2). The client's view
 * buffer holds `unknown`, like every boundary between the room and a game: each game recognises its
 * own with a type guard, never a forced conversion (docs/architecture.md, §7). A view comes from our
 * own server, so the guard tells a Cursor Tag view from another game's rather than validating it.
 */
export function isCursorTagWireView(value: unknown): value is CursorTagWireView {
  if (
    typeof value !== "object" ||
    value === null ||
    !("r" in value && typeof value.r === "number") ||
    !("p" in value && Array.isArray(value.p)) ||
    ("m" in value && value.m !== undefined && !Array.isArray(value.m)) ||
    !("ph" in value)
  ) {
    return false;
  }

  if (value.ph === 1) {
    return "t" in value && typeof value.t === "number";
  }

  return (
    value.ph === 0 &&
    (("a" in value && typeof value.a === "number") || ("c" in value && typeof value.c === "number"))
  );
}
