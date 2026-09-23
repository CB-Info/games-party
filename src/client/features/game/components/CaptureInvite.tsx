import { ArenaVeil } from "../../../components/ui/ArenaVeil";
import { Button } from "../../../components/ui/Button";

/**
 * Shown until the mouse has been captured once in this game (docs/design-system.md, §12). Without
 * it a player lands on an arena with a cursor that will not move and no hint that a click is what
 * starts it. Losing the capture afterwards is a different screen (§11.18): one invites, the other
 * warns.
 */
export function CaptureInvite({ onCapture }: { onCapture: () => void }) {
  return (
    <ArenaVeil>
      <Button onClick={onCapture}>Clique pour capturer ta souris</Button>
    </ArenaVeil>
  );
}
