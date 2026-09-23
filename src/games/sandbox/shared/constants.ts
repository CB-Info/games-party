/** Values of the sandbox (rules.md, §14). It borrows the Cursor Tag arena and its cursor size. */

/** Radius of a cursor disc, in logical units. */
export const SANDBOX_CURSOR_RADIUS = 14;

/**
 * Top speed of a cursor, in logical units per second. Adjustable here and here only: it is what
 * decides whether a fast mouse movement is truncated by the budget (docs/architecture.md, §6.5),
 * so trying several values against a real mouse is exactly what this sandbox is for. Cursor Tag
 * keeps the speed of its own `rules.md`, where it is a rule of the game.
 */
export const SANDBOX_SPEED_MIN = 1000;
export const SANDBOX_SPEED_MAX = 8000;
export const SANDBOX_SPEED_DEFAULT = 1000;
export const SANDBOX_SPEED_STEP = 1000;

/**
 * The « Rattrapage »: how long a cursor may keep catching up once the hand has stopped, in
 * milliseconds of travel at top speed (`shared/cursor/backlog.ts`). Zero is the engine as it is
 * everywhere else, where what the budget refuses is lost. An experiment of this sandbox, to be
 * compared by hand with the current mode before anything is decided for Cursor Tag.
 */
export const SANDBOX_CATCH_UP_MS_MIN = 0;
export const SANDBOX_CATCH_UP_MS_MAX = 500;
export const SANDBOX_CATCH_UP_MS_DEFAULT = 0;
export const SANDBOX_CATCH_UP_MS_STEP = 100;

/** Shortest, longest, default and step of the length of a game, in seconds. */
export const SANDBOX_DURATION_S_MIN = 30;
export const SANDBOX_DURATION_S_MAX = 300;
export const SANDBOX_DURATION_S_DEFAULT = 60;
export const SANDBOX_DURATION_S_STEP = 15;
