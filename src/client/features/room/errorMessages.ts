import type { ErrorCode } from "../../../shared/protocol";

/** The refusals that get a screen of their own (docs/design-system.md, §13). */
export type RoomErrorKind = "full" | "serverFull" | "notFound";

/** A refusal that replaces the whole left column, rather than sitting under the field (§13). */
export function screenErrorOf(error: ErrorCode | null): RoomErrorKind | null {
  if (error === "ROOM_FULL") return "full";
  if (error === "SERVER_FULL") return "serverFull";
  if (error === "ROOM_NOT_FOUND") return "notFound";

  return null;
}

/** A refusal the player can fix by editing the field (docs/design-system.md, §13). */
export function fieldErrorOf(error: ErrorCode | null): string | undefined {
  if (error === "PSEUDO_TAKEN") {
    return "Ce pseudo est déjà pris dans la room. Ajoute un chiffre, ou change complètement.";
  }

  if (error === "INVALID_PAYLOAD") {
    return "Ce pseudo ne convient pas. Essaie autre chose.";
  }

  return undefined;
}

/** What a refused action says in a notification (docs/design-system.md, §11.13). */
export function notificationOf(error: ErrorCode): string {
  if (error === "COLOR_TAKEN") return "Cette couleur vient d’être prise.";
  if (error === "RATE_LIMITED") return "Tu vas trop vite, réessaie dans un instant.";

  return "Action impossible, réessaie.";
}
