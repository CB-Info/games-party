import { useCallback, useState } from "react";

import { readPseudo } from "../../../services/preferences";

/** The pseudo the browser remembers, prefilled in the form (docs/architecture.md, §4). */
export function useStoredPseudo(): [string, (pseudo: string) => void] {
  const [pseudo, setPseudo] = useState(readPseudo);

  // It is written back only once the server accepts it, in `useJoinFlow`.
  return [pseudo, useCallback((next: string) => setPseudo(next), [])];
}
