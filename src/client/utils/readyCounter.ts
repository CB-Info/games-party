/**
 * The ready counter of the lobby, "3 joueurs sur 4 prêts" (docs/design-system.md, §11.12). Both
 * halves agree in number on their own: "0 joueur sur 4 prêt", "1 joueur sur 2 prêt".
 */
export function formatReadyCounter(ready: number, total: number): string {
  const players = ready > 1 ? "joueurs" : "joueur";
  const areReady = ready > 1 ? "prêts" : "prêt";

  return `${ready} ${players} sur ${total} ${areReady}`;
}
