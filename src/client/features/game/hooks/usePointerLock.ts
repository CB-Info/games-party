import { useCallback, useEffect, useState, type RefObject } from "react";

import { isLocked, requestLock, subscribeToLockChange } from "../../../engine/pointerLock";

export interface PointerLockState {
  /** True while the mouse is captured by the arena. */
  locked: boolean;
  /** True until the mouse has been captured at least once in this game. */
  neverCaptured: boolean;
  request: () => void;
}

/**
 * Whether the arena holds the mouse (docs/architecture.md, §6.5). This one value does go through
 * React: it changes when a player presses Escape, not sixty times a second, and it decides which
 * screen is shown.
 */
export function usePointerLock(target: RefObject<Element | null>): PointerLockState {
  const [locked, setLocked] = useState(false);
  const [neverCaptured, setNeverCaptured] = useState(true);

  useEffect(
    () =>
      subscribeToLockChange(() => {
        const element = target.current;
        const now = element !== null && isLocked(element);

        setLocked(now);
        if (now) {
          setNeverCaptured(false);
        }
      }),
    [target],
  );

  const request = useCallback(() => {
    const element = target.current;
    if (element !== null) {
      requestLock(element);
    }
  }, [target]);

  return { locked, neverCaptured, request };
}
