/** Port used when the hosting platform provides none (docs/architecture.md, §13). */
export const DEFAULT_SERVER_PORT = 3000;

/** Cache lifetime of the hashed client assets, in seconds (docs/architecture.md, §13). */
export const STATIC_ASSETS_MAX_AGE_S = 31536000;

/** Largest incoming Socket.IO message accepted, in bytes (docs/architecture.md, §13). */
export const MAX_MESSAGE_BYTES = 16384;

/** People allowed in one room, spectators and bots included (docs/architecture.md, §13). */
export const ROOM_CAPACITY = 10;

/** Number of characters of a room code (docs/architecture.md, §13). */
export const ROOM_CODE_LENGTH = 10;

/** Alphabet of a room code, without look-alike characters (docs/architecture.md, §13). */
export const ROOM_CODE_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";

/** Rooms living at the same time (docs/architecture.md, §13). */
export const MAX_ROOMS = 50;

/** Delay before an empty room is deleted, in milliseconds (docs/architecture.md, §13). */
export const EMPTY_ROOM_TTL_MS = 300000;

/** Delay a disconnected player keeps their seat, in milliseconds (docs/architecture.md, §13). */
export const RECONNECT_GRACE_MS = 300000;

/** Interval between two sweeps of empty rooms and idle sessions (docs/architecture.md, §13). */
export const MAINTENANCE_INTERVAL_MS = 60000;

/** Delay before the results screen returns to the lobby, in milliseconds (docs/architecture.md, §13). */
export const RESULTS_AUTO_RETURN_MS = 20000;

/** Shortest accepted pseudo, in characters (docs/architecture.md, §13). */
export const PSEUDO_MIN_LENGTH = 2;

/** Longest accepted pseudo, in characters (docs/architecture.md, §13). */
export const PSEUDO_MAX_LENGTH = 16;

/** Player colours, in the fixed order used to hand out a free one (docs/architecture.md, §13). */
export const PLAYER_COLOR_IDS = [
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "c9",
  "c10",
] as const;

/** Number of characters of a secret session token (docs/architecture.md, §13). */
export const SESSION_TOKEN_LENGTH = 32;

/** Number of characters of a public player id (docs/architecture.md, §13). */
export const SESSION_PLAYER_ID_LENGTH = 12;

/** Lifetime of a session bound to no socket and no room, in milliseconds (docs/architecture.md, §13). */
export const SESSION_TTL_MS = 86400000;

/** Logical width of the arena (docs/architecture.md, §13). */
export const ARENA_WIDTH = 1600;

/** Logical height of the arena (docs/architecture.md, §13). */
export const ARENA_HEIGHT = 900;

/** Server loop steps per second (docs/architecture.md, §13). */
export const SERVER_TICK_RATE = 30;

/** Longest step handed to a game, in milliseconds (docs/architecture.md, §13). */
export const MAX_TICK_DT_MS = 100;

/** Inputs a client sends per second while its cursor moves (docs/architecture.md, §13). */
export const INPUT_SEND_RATE = 30;

/** Multiplier applied to every mouse movement, the same for everyone (docs/architecture.md, §13). */
export const CURSOR_SENSITIVITY = 1;

/** Largest accepted component of one input, in logical units (docs/architecture.md, §13). */
export const MAX_INPUT_DELTA = 2000;

/** How much movement a cursor may bank, in milliseconds of travel (docs/architecture.md, §13). */
export const MOVE_BUDGET_CAP_MS = 200;

/** Longest step a move is cut into before testing walls, in logical units (docs/architecture.md, §13). */
export const MOVE_SUBSTEP = 7;

/** How far behind the server the other cursors are drawn, in milliseconds (docs/architecture.md, §13). */
export const INTERPOLATION_DELAY_MS = 100;

/** How long received views are kept for interpolation, in milliseconds (docs/architecture.md, §13). */
export const INTERPOLATION_BUFFER_MS = 1000;

/** Largest gap the local cursor catches up smoothly, in logical units (docs/architecture.md, §13). */
export const CORRECTION_SNAP_DISTANCE = 48;

/** How long the local cursor takes to rejoin its predicted place, in ms (docs/architecture.md, §13). */
export const CORRECTION_SMOOTHING_MS = 100;

/** Beyond this jump, another cursor is redrawn without interpolation (docs/architecture.md, §13). */
export const TELEPORT_SNAP_DISTANCE = 200;

/** Delay between two Socket.IO pings, in milliseconds (docs/architecture.md, §13). */
export const SOCKET_PING_INTERVAL_MS = 5000;

/** Silence after a ping before a socket is given up, in milliseconds (docs/architecture.md, §13). */
export const SOCKET_PING_TIMEOUT_MS = 5000;

/** Messages accepted per sliding second and per socket (docs/architecture.md, §13). */
export const RATE_LIMIT_MESSAGES_PER_SECOND = 60;

/** Time over the message limit before a socket is disconnected, in milliseconds (docs/architecture.md, §13). */
export const RATE_LIMIT_KICK_AFTER_MS = 5000;

/** Unknown-room failures accepted per sliding minute and per socket (docs/architecture.md, §13). */
export const MAX_JOIN_FAILURES_PER_MINUTE = 10;

/** How long a notification stays on screen, in milliseconds (docs/design-system.md, §11.13). */
export const NOTIFICATION_DURATION_MS = 4000;

/** How long "Lien copié" replaces the button label, in milliseconds (docs/design-system.md, §11.2). */
export const COPY_FEEDBACK_MS = 2000;
