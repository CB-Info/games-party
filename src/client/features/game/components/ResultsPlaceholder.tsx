/**
 * What the room shows between a finished game and its return to the lobby.
 *
 * **Provisional.** The results screen of docs/design-system.md, §13 — podium, per-game ranking,
 * the evening's standings — arrives at step 4 with Cursor Tag. Starting it here would mean
 * unpicking it then: a sandbox has nothing worth a podium. The automatic return already works, so
 * a sentence is enough for nobody to feel stranded.
 */
export function ResultsPlaceholder() {
  return (
    <main className="flex flex-1 flex-col gap-2 px-12 pb-10 wide:px-14">
      <h1 className="t-title-1">Partie terminée.</h1>
      <p className="t-body text-ink-secondary">
        Retour au lobby dans un instant. L’écran de résultats arrive à l’étape suivante.
      </p>
    </main>
  );
}
