import { PSEUDO_MAX_LENGTH, PSEUDO_MIN_LENGTH } from "./constants";

// Anything a terminal or a screen reader would choke on, plus the bidirectional overrides that
// could make a pseudo display as something else entirely.
const CONTROL_CHARACTERS = /[\p{Cc}\p{Cf}]/u;

/** Trims the ends of a pseudo, as the server stores it (docs/architecture.md, §4). */
export function normalizePseudo(pseudo: string): string {
  return pseudo.trim();
}

/** True when a normalised pseudo may be used in a room (docs/architecture.md, §4). */
export function isValidPseudo(pseudo: string): boolean {
  return (
    [...pseudo].length >= PSEUDO_MIN_LENGTH &&
    [...pseudo].length <= PSEUDO_MAX_LENGTH &&
    !CONTROL_CHARACTERS.test(pseudo)
  );
}

/** Key used to compare two pseudos in a room: unique regardless of case (docs/architecture.md, §4). */
export function pseudoKey(pseudo: string): string {
  return normalizePseudo(pseudo).toLocaleLowerCase("fr");
}

/**
 * Orders two players the way every ranking shows ties: by pseudo, ignoring case and accents, then
 * by player id so that two pseudos differing only by an accent keep a stable order
 * (docs/architecture.md, §5.6).
 */
export function comparePseudos(
  a: { pseudo: string; playerId: string },
  b: { pseudo: string; playerId: string },
): number {
  const byPseudo = a.pseudo.localeCompare(b.pseudo, "fr", { sensitivity: "base" });
  return byPseudo !== 0 ? byPseudo : a.playerId.localeCompare(b.playerId);
}
