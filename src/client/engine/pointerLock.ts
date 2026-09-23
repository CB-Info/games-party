/**
 * Mouse capture (docs/architecture.md, §6.5). `unadjustedMovement` is deliberately left out, so
 * that each player's own acceleration and sensitivity still apply and the virtual cursor behaves
 * like the cursor they are used to.
 */
export function requestLock(element: Element): void {
  void element.requestPointerLock();
}

export function exitLock(): void {
  document.exitPointerLock();
}

export function isLocked(element: Element): boolean {
  return document.pointerLockElement === element;
}

/** Calls back whenever the capture is taken or lost — Escape, alt-tab, or the click that asks. */
export function subscribeToLockChange(onChange: () => void): () => void {
  document.addEventListener("pointerlockchange", onChange);

  return () => {
    document.removeEventListener("pointerlockchange", onChange);
  };
}
