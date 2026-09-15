/** Port used when the hosting platform provides none (docs/architecture.md, §13). */
export const DEFAULT_SERVER_PORT = 3000;

/** Cache lifetime of the hashed client assets, in seconds (docs/architecture.md, §13). */
export const STATIC_ASSETS_MAX_AGE_S = 31536000;

/** Largest incoming Socket.IO message accepted, in bytes (docs/architecture.md, §13). */
export const MAX_MESSAGE_BYTES = 16384;
