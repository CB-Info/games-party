/**
 * The number a frozen cursor shows (docs/design-system.md, §12): whole seconds rounded up, like a
 * countdown — 3, 2, 1 for a freeze of three seconds — and nothing once the freeze is over. The
 * role pill of the information band shows the same number.
 */
export function freezeSecondsShown(frozenMsLeft: number): number | null {
  return frozenMsLeft > 0 ? Math.ceil(frozenMsLeft / 1000) : null;
}
