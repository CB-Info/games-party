import { overlapsAnyWall, type Point } from "../../../shared/cursor/collision";
import { ARENA_HEIGHT, ARENA_WIDTH } from "../../../shared/constants";
import type { CursorInput } from "../../../shared/cursor/cursorInput";
import { WALLS } from "../../cursor-tag/shared/map";
import type { BotPolicy } from "../../gameServer.types";
import { SANDBOX_CURSOR_RADIUS, SANDBOX_SPEED_DEFAULT } from "../shared/constants";
import type { SandboxView } from "../shared/types";

/** How fast a bot swings its heading round, in radians per second. */
const TURN_RATE = 1.2;

/** How far it wobbles around that heading, in radians. */
const JITTER_RAD = 0.35;

/** How far ahead a bot looks for something to avoid, in logical units. */
const LOOK_AHEAD = 90;

/**
 * A bot that wanders and turns away from what it is about to hit (docs/architecture.md, §8). It
 * has nothing to chase in the sandbox: what matters is that several cursors move at once, meet
 * walls and give the client something to interpolate.
 *
 * It keeps **no state**. `BotPolicy` is called once per tick with nothing but the view, so a
 * module-level map would be shared by every room and never cleaned. The heading comes from the
 * clock the view already carries, offset per bot; and the way out of a wall is read from the
 * position, not remembered — a bot pressed against the edge would otherwise stay there, and stop
 * exercising the collisions in the middle of the arena, which is the whole point of the sandbox.
 */
export const sandboxBot: BotPolicy<CursorInput, never, SandboxView> = {
  nextInput(view, botPlayerId, dtMs, random): CursorInput | null {
    const me = view.players.find((player) => player.playerId === botPlayerId);
    if (me === undefined) {
      return null;
    }

    // The wobble is added before the way is checked, not after: a direction found clear and then
    // nudged by a fifth of a radian could point straight back into the wall it was avoiding.
    const wander = phaseOf(botPlayerId) - (view.timeLeftMs / 1000) * TURN_RATE + wobble(random);
    const heading = freeHeading(me, wander) ?? wander;
    // Always the default speed, whatever the host chose for the humans: a bot moving at a known,
    // unchanging pace is the fixed point you compare your own cursor against while trying the
    // speed option, and it is the only speed the view carries no word of anyway.
    const length = (SANDBOX_SPEED_DEFAULT * dtMs) / 1000;

    // A bot's input never crosses the network, so it needs no sequence number: the game applies it
    // without the guard that protects a human's inputs from being replayed (§6.5).
    return { seq: 0, dx: Math.cos(heading) * length, dy: Math.sin(heading) * length };
  },

  nextAction(): null {
    return null;
  },
};

/**
 * The wandering heading if the way is clear, otherwise the first free direction found by turning
 * away from it. Eight tries is enough to find a way out of any corner of this map, and cheap:
 * three bots at thirty ticks a second is ninety of these a second at worst.
 */
function freeHeading(from: Point, wander: number): number | null {
  if (isClear(from, wander)) {
    return wander;
  }

  for (let turn = 1; turn <= 8; turn += 1) {
    const angle = wander + (turn * Math.PI) / 4;
    if (isClear(from, angle)) {
      return angle;
    }
  }

  return null;
}

/**
 * True when nothing stands along `LOOK_AHEAD` in that direction. The whole way is sampled, not
 * just its end: a direction that grazes a corner has a clear end point and still walks into the
 * wall on the way there.
 */
function isClear(from: Point, heading: number): boolean {
  const step = { x: Math.cos(heading), y: Math.sin(heading) };

  for (const distance of [LOOK_AHEAD / 3, (LOOK_AHEAD * 2) / 3, LOOK_AHEAD]) {
    const ahead = { x: from.x + step.x * distance, y: from.y + step.y * distance };

    const insideArena =
      ahead.x >= SANDBOX_CURSOR_RADIUS &&
      ahead.x <= ARENA_WIDTH - SANDBOX_CURSOR_RADIUS &&
      ahead.y >= SANDBOX_CURSOR_RADIUS &&
      ahead.y <= ARENA_HEIGHT - SANDBOX_CURSOR_RADIUS;

    if (!insideArena || overlapsAnyWall(ahead, SANDBOX_CURSOR_RADIUS, WALLS)) {
      return false;
    }
  }

  return true;
}

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
