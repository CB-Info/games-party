import { useCallback, useRef, useState } from "react";

import { exitLock } from "../../../../client/engine/pointerLock";
import type { CursorTagView, Role } from "../../shared/types";

export interface TagRoundState {
  /** Null until the first view has arrived. */
  phase: CursorTagView["phase"] | null;
  /** The local player's role in the round, or `null` between two rounds and for a spectator. */
  role: Role | null;
  /** Called by the render loop at every frame; changes the state only when something changed. */
  report: (phase: CursorTagView["phase"], role: Role | null) => void;
}

/**
 * The phase of the game and the local player's role, which decide the veil and what it warns of.
 * These two go through React: they change a few times a round, not sixty times a second
 * (règle d'or 4), and the render loop reports them only when they change.
 *
 * At the end of a round the mouse is released (rules.md, §4.1). The phase is changed first: when
 * the capture's loss is heard, the preparation is already known, and no « Clique pour reprendre »
 * flashes for a frame.
 */
export function useTagRoundState(): TagRoundState {
  const [state, setState] = useState<Omit<TagRoundState, "report">>({ phase: null, role: null });
  const last = useRef(state);

  const report = useCallback((phase: CursorTagView["phase"], role: Role | null) => {
    const before = last.current;
    if (before.phase === phase && before.role === role) {
      return;
    }

    last.current = { phase, role };
    setState(last.current);
    if (before.phase === "round" && phase === "preparation") {
      exitLock();
    }
  }, []);

  return { ...state, report };
}
