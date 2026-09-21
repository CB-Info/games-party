import { useCallback, useState } from "react";

import { readSoundEnabled, writeSoundEnabled } from "../../../services/preferences";

/**
 * Whether the player wants sound. Nothing plays before step 5: the button only remembers the
 * choice (docs/design-system.md, §15).
 */
export function useSoundPreference(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState(readSoundEnabled);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      writeSoundEnabled(!current);
      return !current;
    });
  }, []);

  return { enabled, toggle };
}
