import { useEffect, useMemo } from "react";

import type { ViewStore } from "../../../../games/gameView.types";
import { createViewStore } from "../../../engine/viewStore";
import { subscribeToGameView } from "../../../services/socketClient";

/**
 * The buffer of views a game's screen reads from (docs/architecture.md, §7). Views arrive thirty
 * times a second and never go through React state: the subscription writes straight into the
 * store, and the render loop reads it (règle d'or 4).
 */
export function useGameView(): ViewStore {
  const store = useMemo(() => createViewStore(), []);

  useEffect(() => {
    // A game that is starting knows nothing yet. Emptying here also covers the second game of an
    // evening, where the screen is mounted again with the previous game's views still in hand.
    store.clear();

    return subscribeToGameView((payload) => store.push(payload, Date.now()));
  }, [store]);

  return store;
}
