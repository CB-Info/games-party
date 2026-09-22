// A touch screen with no mouse at all: coarse pointer, and no fine pointer anywhere
// (docs/architecture.md, §2).
const COARSE_ONLY = "(pointer: coarse) and (not (any-pointer: fine))";

function query(): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(COARSE_ONLY) : null;
}

export function hasMouse(): boolean {
  return !(query()?.matches ?? false);
}

/** Calls `onChange` when a pointing device is plugged in or removed. Returns the unsubscribe. */
export function subscribeToPointerCapability(onChange: () => void): () => void {
  const media = query();
  media?.addEventListener("change", onChange);

  return () => {
    media?.removeEventListener("change", onChange);
  };
}
