import { useCallback, useEffect, useState } from "react";

import type { ErrorCode } from "../../../../shared/protocol";
import type { PlayerColorId, RoomState } from "../../../../shared/types";
import {
  leaveRoom,
  selectGame,
  setColor,
  setGameOptions,
  setReady,
  startGame,
} from "../../../services/roomRequests";
import { subscribeToReconnection, subscribeToRoomState } from "../../../services/socketClient";

export interface RoomActions {
  setColor: (color: PlayerColorId) => Promise<ErrorCode | null>;
  setReady: (ready: boolean) => Promise<ErrorCode | null>;
  selectGame: (gameId: string) => Promise<ErrorCode | null>;
  setOptions: (options: unknown) => Promise<ErrorCode | null>;
  start: (force: boolean) => Promise<ErrorCode | null>;
  leave: () => void;
}

/** Turns an acknowledgement into the refusal code, or null when it worked. */
async function refusalOf(answer: Promise<{ ok: true } | { ok: false; error: ErrorCode }>) {
  const result = await answer;
  return result.ok ? null : result.error;
}

/**
 * The room as the server broadcasts it, plus the actions a member can take. The state is never
 * guessed locally: every change comes back through `room:state` (docs/architecture.md, §6.2).
 */
export function useRoom(): { state: RoomState | null; actions: RoomActions } {
  const [state, setState] = useState<RoomState | null>(null);

  useEffect(() => subscribeToRoomState(setState), []);

  // On a reconnection the server says again whether this browser still holds a seat. Until it
  // does, the client knows nothing: the seat may have expired while the connection was down
  // (docs/architecture.md, §10). The content only empties once the connection is back, so a
  // passing cut leaves the lobby on screen.
  useEffect(() => subscribeToReconnection(() => setState(null)), []);

  const actions: RoomActions = {
    setColor: useCallback((color: PlayerColorId) => refusalOf(setColor(color)), []),
    setReady: useCallback((ready: boolean) => refusalOf(setReady(ready)), []),
    selectGame: useCallback((gameId: string) => refusalOf(selectGame(gameId)), []),
    setOptions: useCallback((options: unknown) => refusalOf(setGameOptions(options)), []),
    start: useCallback((force: boolean) => refusalOf(startGame(force)), []),
    leave: useCallback(() => {
      setState(null);
      leaveRoom();
    }, []),
  };

  return { state, actions };
}
