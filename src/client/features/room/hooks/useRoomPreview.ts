import { useCallback, useEffect, useState } from "react";

import type { ErrorCode } from "../../../../shared/protocol";
import type { RoomPreview } from "../../../../shared/types";
import { previewRoom } from "../../../services/roomRequests";
import { subscribeToReconnection } from "../../../services/socketClient";

export type PreviewState =
  | { status: "loading" }
  | { status: "ready"; preview: RoomPreview }
  | { status: "failed"; error: ErrorCode };

export interface RoomPreviewApi {
  preview: PreviewState;
  /** Asks for the room again, for instance once a pseudo came back as already taken (§11.10). */
  refresh: () => void;
}

/**
 * A snapshot of a room, asked once on arrival. It is never retried on its own: an unknown code
 * counts against the per-socket failure limit, so a loop would rate-limit the player
 * (docs/architecture.md, §5.7 and §9). Only `refresh` asks again, on a player's action.
 */
export function useRoomPreview(code: string): RoomPreviewApi {
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // A reconnection may mean another answer: the room may have gone while the connection was down
  // (docs/architecture.md, §10). Both this and the room being forgotten happen in the same
  // callback, so the screen goes back to knowing nothing in one step.
  useEffect(
    () =>
      subscribeToReconnection(() => {
        setPreview({ status: "loading" });
        setAttempt((previous) => previous + 1);
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    previewRoom(code)
      .then((answer) => {
        if (cancelled) {
          return;
        }

        setPreview(
          answer.ok
            ? { status: "ready", preview: answer.data }
            : { status: "failed", error: answer.error },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPreview({ status: "failed", error: "ROOM_NOT_FOUND" });
        }
      });

    return () => {
      cancelled = true;
    };
    // `attempt` is what a refresh bumps. The shown room is never emptied meanwhile: the previous
    // answer stays on screen until the new one replaces it.
  }, [code, attempt]);

  return {
    preview,
    refresh: useCallback(() => setAttempt((previous) => previous + 1), []),
  };
}
