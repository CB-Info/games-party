import { useSyncExternalStore } from "react";

import { hasMouse, subscribeToPointerCapability } from "../services/pointerCapability";

/** False on a touch screen with no mouse at all (docs/architecture.md, §2). */
export function useHasMouse(): boolean {
  return useSyncExternalStore(subscribeToPointerCapability, hasMouse);
}
