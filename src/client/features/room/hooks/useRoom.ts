import { useCallback, useSyncExternalStore } from "react";

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
import { roomState } from "../../../services/roomState";

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
 *
 * It is read as a snapshot rather than collected by an effect. The room the server sends when it
 * is created arrives while the home screen is still showing, so a hook subscribing on mount would
 * never see it. The service also forgets the room when the connection comes back and when another
 * tab takes the session over (§10, §4).
 */
export function useRoom(): { state: RoomState | null; actions: RoomActions } {
  const state = useSyncExternalStore(roomState.subscribe, roomState.get);

  const actions: RoomActions = {
    setColor: useCallback((color: PlayerColorId) => refusalOf(setColor(color)), []),
    setReady: useCallback((ready: boolean) => refusalOf(setReady(ready)), []),
    selectGame: useCallback((gameId: string) => refusalOf(selectGame(gameId)), []),
    setOptions: useCallback((options: unknown) => refusalOf(setGameOptions(options)), []),
    start: useCallback((force: boolean) => refusalOf(startGame(force)), []),
    leave: useCallback(() => leaveRoom(), []),
  };

  return { state, actions };
}
