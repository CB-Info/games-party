import { useMemo } from "react";

import { sendGameAction, sendGameInput } from "../../../services/gameRequests";

export interface GameChannel {
  sendInput: (input: unknown) => void;
  sendAction: (action: unknown) => Promise<{ ok: boolean }>;
}

/**
 * What a running game sends (docs/architecture.md, §6.2). It exists so that a component never
 * reaches a service directly: only a hook may, which is what the layer rules check.
 */
export function useGameChannel(): GameChannel {
  return useMemo(() => ({ sendInput: sendGameInput, sendAction: sendGameAction }), []);
}
