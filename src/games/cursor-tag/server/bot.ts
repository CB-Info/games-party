import { clearHeading } from "../../../shared/cursor/clearHeading";
import type { CursorInput } from "../../../shared/cursor/cursorInput";
import type { BotPolicy } from "../../gameServer.types";
import { maxSpeedOf } from "../logic/movement";
import { readView } from "../logic/readView";
import {
  BOT_JITTER_RAD,
  BOT_LOOK_AHEAD,
  BOT_WANDER_CHANGE_MS,
  CURSOR_RADIUS,
} from "../shared/constants";
import { WALLS } from "../shared/map";
import type { CursorTagAction } from "../shared/schemas";
import type { CursorTagWireView, RoundView, RoundViewPlayer } from "../shared/types";

/** FNV-1a, 32 bits: where the hash of the wandering direction starts, and what it multiplies by. */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** The last mixing steps of MurmurHash3, which spread a one-character change over every bit. */
const MIX_FIRST = 0x85ebca6b;
const MIX_SECOND = 0xc2b2ae35;

/** Values a 32-bit hash can take, to turn it into a share of a whole turn. */
const HASH_VALUES = 2 ** 32;

/**
 * How a development bot plays Cursor Tag (rules.md, §12; docs/architecture.md, §8). It reads the
 * view it is given, as a player would, and keeps **no state**: the same policy serves every room,
 * so anything it remembered would be shared between them and never cleaned.
 */
export const cursorTagBot: BotPolicy<CursorInput, CursorTagAction, CursorTagWireView> = {
  nextInput(wire, botPlayerId, dtMs, random): CursorInput | null {
    const view = readView(wire);
    if (view.phase !== "round") {
      return null;
    }

    // A frozen player's inputs are ignored anyway (rules.md, §6.2).
    const me = view.players.find((player) => player.playerId === botPlayerId);
    if (me === undefined || me.frozenMsLeft > 0) {
      return null;
    }

    // The jitter is added before the way is checked, not after: a direction found clear and then
    // nudged could point straight back into the wall it was avoiding.
    const wanted = purposeOf(view, me) ?? wanderingOf(botPlayerId, view);
    const jittered = wanted + (random() * 2 - 1) * BOT_JITTER_RAD;
    const heading =
      clearHeading({
        from: me,
        heading: jittered,
        radius: CURSOR_RADIUS,
        walls: WALLS,
        lookAhead: BOT_LOOK_AHEAD,
      }) ?? jittered;
    const length = (maxSpeedOf(me.role) * dtMs) / 1000;

    // A bot's input never crosses the network, so it needs no sequence number: the game applies it
    // without the guard that protects a person's inputs from being replayed (architecture §6.5).
    return { seq: 0, dx: Math.cos(heading) * length, dy: Math.sin(heading) * length };
  },

  /** Ready from the start of the waiting, so that nobody waits for a bot (rules.md, §4.1). */
  nextAction(wire, botPlayerId): CursorTagAction | null {
    const view = readView(wire);
    const waiting = view.phase === "preparation" && view.preparationStep === "waiting";

    return waiting && !view.readyPlayerIds.includes(botPlayerId) ? { type: "ready" } : null;
  },
};

/**
 * A Chat heads for the nearest connected Runner; a Runner away from the nearest Chat that is
 * neither frozen nor away, since only such a Chat can tag (rules.md, §6.3). Null when there is
 * nobody to chase or to flee.
 */
function purposeOf(view: RoundView, me: RoundViewPlayer): number | null {
  if (me.role === "chat") {
    const prey = nearestTo(
      me,
      view.players.filter((player) => player.role === "runner" && player.connected),
    );
    return prey === null ? null : Math.atan2(prey.y - me.y, prey.x - me.x);
  }

  const threat = nearestTo(
    me,
    view.players.filter(
      (player) => player.role === "chat" && player.connected && player.frozenMsLeft === 0,
    ),
  );
  return threat === null ? null : Math.atan2(me.y - threat.y, me.x - threat.x);
}

function nearestTo(me: RoundViewPlayer, others: RoundViewPlayer[]): RoundViewPlayer | null {
  let nearest: RoundViewPlayer | null = null;
  let nearestDistance = Infinity;

  for (const other of others) {
    const distance = Math.hypot(other.x - me.x, other.y - me.y);
    if (distance < nearestDistance) {
      nearest = other;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * A direction of its own for each bot, changed every `BOT_WANDER_CHANGE_MS` of the round (rules.md,
 * §12). With no memory to keep one, it is drawn from the bot, the round and the slice of time the
 * round has reached: the same all through the slice, unrelated to the next one.
 */
function wanderingOf(botPlayerId: string, view: RoundView): number {
  const slice = Math.floor(view.roundTimeLeftMs / BOT_WANDER_CHANGE_MS);
  return (hashOf(`${botPlayerId}:${view.round}:${slice}`) / HASH_VALUES) * 2 * Math.PI;
}

/**
 * FNV-1a over the characters, then MurmurHash3's final mix. FNV-1a alone would turn most slices
 * barely a degree and a half from the one before: the last character is the one that changes, and
 * it hardly moves the top bits the direction is read from.
 */
function hashOf(text: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (const character of text) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), FNV_PRIME);
  }

  hash = Math.imul(hash ^ (hash >>> 16), MIX_FIRST);
  hash = Math.imul(hash ^ (hash >>> 13), MIX_SECOND);
  return (hash ^ (hash >>> 16)) >>> 0;
}
