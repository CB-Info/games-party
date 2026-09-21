import { useCallback, useState } from "react";

import type { AckResponse, ErrorCode } from "../../../../shared/protocol";
import type { PlayerColorId } from "../../../../shared/types";
import { normalizePseudo } from "../../../../shared/pseudo";
import { readPreferredColor, writePseudo } from "../../../services/preferences";
import { createRoom, joinRoom } from "../../../services/roomRequests";

/** The code on success, the refusal otherwise: the caller often needs to act on the reason. */
export type JoinAnswer = AckResponse<{ code: string; pseudo: string }>;

export interface JoinFlow {
  busy: boolean;
  /** Set when the server refused, so that the screen can show it where it belongs. */
  error: ErrorCode | null;
  create: (pseudo: string) => Promise<JoinAnswer>;
  join: (code: string, pseudo: string) => Promise<JoinAnswer>;
  clearError: () => void;
}

/** Creating or joining a room, with the pseudo remembered on success (docs/architecture.md, §4). */
export function useJoinFlow(): JoinFlow {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);

  const run = useCallback(
    async (
      pseudo: string,
      request: (clean: string, color: PlayerColorId) => ReturnType<typeof createRoom>,
    ): Promise<JoinAnswer> => {
      const clean = normalizePseudo(pseudo);

      setBusy(true);
      setError(null);

      try {
        const answer = await request(clean, readPreferredColor());

        if (!answer.ok) {
          setError(answer.error);
          return answer;
        }

        writePseudo(clean);
        return { ok: true, data: { code: answer.data.code, pseudo: clean } };
      } catch {
        setError("ROOM_NOT_FOUND");
        return { ok: false, error: "ROOM_NOT_FOUND" };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    busy,
    error,
    create: useCallback(
      (pseudo: string) =>
        run(pseudo, (clean, preferredColor) => createRoom({ pseudo: clean, preferredColor })),
      [run],
    ),
    join: useCallback(
      (code: string, pseudo: string) =>
        run(pseudo, (clean, preferredColor) => joinRoom({ code, pseudo: clean, preferredColor })),
      [run],
    ),
    clearError: useCallback(() => setError(null), []),
  };
}
