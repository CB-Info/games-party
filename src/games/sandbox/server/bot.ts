import type { CursorInput } from "../../../shared/cursor/cursorInput";
import type { BotPolicy } from "../../gameServer.types";
import { SANDBOX_MAX_SPEED } from "../shared/constants";
import type { SandboxView } from "../shared/types";

/** How fast a bot swings its heading round, in radians per second. */
const TURN_RATE = 1.2;

/** How far it wobbles around that heading, in radians. */
const JITTER_RAD = 0.35;

/**
 * A bot that wanders in a slow arc. It has nothing to chase in the sandbox: what matters is that
 * several cursors move at once, meet walls and give the client something to interpolate (§8).
 *
 * It keeps **no state**. `BotPolicy` is called once per tick with nothing but the view, so a
 * module-level map would be shared by every room and never cleaned. The heading is derived instead
 * from the clock the view already carries, offset per bot: each one walks its own circle, and one
 * pressed against a wall keeps turning until it slides free.
 */
export const sandboxBot: BotPolicy<CursorInput, never, SandboxView> = {
  nextInput(view, botPlayerId, dtMs, random): CursorInput | null {
    if (!view.players.some((player) => player.playerId === botPlayerId)) {
      return null;
    }

    const heading = phaseOf(botPlayerId) - (view.timeLeftMs / 1000) * TURN_RATE + wobble(random);
    const length = (SANDBOX_MAX_SPEED * dtMs) / 1000;

    // A bot's input never crosses the network, so it needs no sequence number: the game applies it
    // without the guard that protects a human's inputs from being replayed (§6.5).
    return { seq: 0, dx: Math.cos(heading) * length, dy: Math.sin(heading) * length };
  },

  nextAction(): null {
    return null;
  },
};

function wobble(random: () => number): number {
  return (random() * 2 - 1) * JITTER_RAD;
}

/** A starting angle of its own for each bot, so that two of them do not walk in step. */
function phaseOf(botPlayerId: string): number {
  let sum = 0;
  for (const character of botPlayerId) {
    sum += character.codePointAt(0) ?? 0;
  }

  return (sum % 360) * (Math.PI / 180);
}
