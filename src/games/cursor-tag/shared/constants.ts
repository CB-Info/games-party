/**
 * Values of Cursor Tag (rules.md, §14). Speeds, radii and durations are starting values, to be
 * tuned after the test with the group by changing this file. Tests are written against these
 * names, never against their values, so that changing one needs nothing else.
 */

/** Fewest and most players a game accepts. */
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

/** Radius of a cursor disc, in logical units. */
export const CURSOR_RADIUS = 14;

/** Top speed of a Runner, in logical units per second. Provisional (rules.md, §15.3). */
export const RUNNER_MAX_SPEED = 1000;

/** How much faster than a Runner a Chat may go. Provisional (rules.md, §15.2). */
export const CHAT_SPEED_MULTIPLIER = 1.15;

/** Distance between two centres at which a Chat tags a Runner, in logical units. */
export const TAG_DISTANCE = 28;

/** Length of the countdown that ends a preparation, in milliseconds. */
export const PREPARATION_COUNTDOWN_MS = 3000;

/** How long a preparation waits for everyone to be ready before counting down anyway. */
export const PREPARATION_AUTO_START_MS = 20000;

/** Number of Chats: its lower bound, default and step. Its upper bound depends on the players. */
export const CHAT_COUNT_MIN = 1;
export const CHAT_COUNT_DEFAULT = 1;
export const CHAT_COUNT_STEP = 1;

/** Number of rounds: bounds, default and step. */
export const ROUND_COUNT_MIN = 1;
export const ROUND_COUNT_MAX = 5;
export const ROUND_COUNT_DEFAULT = 3;
export const ROUND_COUNT_STEP = 1;

/** Length of a round, in seconds: bounds, default and step. */
export const ROUND_DURATION_S_MIN = 30;
export const ROUND_DURATION_S_MAX = 120;
export const ROUND_DURATION_S_DEFAULT = 60;
export const ROUND_DURATION_S_STEP = 15;

/** Length of a freeze, in seconds: bounds, default and step. */
export const FREEZE_DURATION_S_MIN = 1;
export const FREEZE_DURATION_S_MAX = 5;
export const FREEZE_DURATION_S_DEFAULT = 3;
export const FREEZE_DURATION_S_STEP = 1;

/** Radius of a portal, in logical units. */
export const PORTAL_RADIUS = 36;

/** How long a pair of portals stays unusable for the player it has just carried. */
export const PORTAL_COOLDOWN_MS = 2000;

/** How often a wandering bot Runner picks a new direction, in milliseconds. */
export const BOT_WANDER_CHANGE_MS = 1000;

/** Largest random angle a bot adds to its direction, in radians. */
export const BOT_JITTER_RAD = 0.3;

/**
 * The catch-up leash, in milliseconds of travel at the role's speed (rules.md, §6.2). Zero is the
 * engine without catch-up. Provisional (rules.md, §15.3): read by `logic/cursorTagOptions.ts`
 * alone, so that the tests can run the game at another value.
 */
export const CATCH_UP_MS = 0;

/**
 * How many ticks back a Runner's path is taken when a Chat tries to tag them (rules.md, §6.3).
 * Zero is the server judging on its own positions. Provisional (rules.md, §15.2): read by
 * `logic/cursorTagOptions.ts` alone, like `CATCH_UP_MS`.
 */
export const TAG_REWIND_TICKS = 0;
