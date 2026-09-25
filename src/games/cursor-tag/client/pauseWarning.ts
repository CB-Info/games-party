import type { Role } from "../shared/types";

/**
 * What losing the mouse costs in Cursor Tag, for the role the player has (docs/design-system.md,
 * §11.18): a Runner can be caught while their cursor stands still, a Chat catches nobody.
 */
export function pauseWarningFor(role: Role): string {
  return role === "chat"
    ? "Ton curseur ne bouge plus : tu n’attrapes plus personne"
    : "Ton curseur ne bouge plus : tu peux te faire attraper";
}
