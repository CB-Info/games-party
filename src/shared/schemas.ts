import { z } from "zod";

import { PLAYER_COLOR_IDS, PSEUDO_MAX_LENGTH, ROOM_CODE_LENGTH } from "./constants";

// Every incoming message is validated before the room ever sees it (règle d'or 3). Objects are
// strict: an unexpected key is a refusal, not something silently dropped.

const colorSchema = z.enum(PLAYER_COLOR_IDS);

// Length is checked after trimming, in `isValidPseudo`: the schema only bounds what is accepted on
// the wire, so that a padded pseudo is not rejected before it is trimmed.
const pseudoSchema = z
  .string()
  .min(1)
  .max(PSEUDO_MAX_LENGTH * 2);

const roomCodeSchema = z.string().length(ROOM_CODE_LENGTH);

export const roomCreateSchema = z.strictObject({
  pseudo: pseudoSchema,
  preferredColor: colorSchema,
});

export const roomPreviewSchema = z.strictObject({
  code: roomCodeSchema,
});

export const roomJoinSchema = z.strictObject({
  code: roomCodeSchema,
  pseudo: pseudoSchema,
  preferredColor: colorSchema,
});

export const lobbySetColorSchema = z.strictObject({
  color: colorSchema,
});

export const lobbySelectGameSchema = z.strictObject({
  gameId: z.string().min(1).max(64),
});

/** The options themselves are validated by the game's own schema (docs/architecture.md, §7). */
export const lobbySetOptionsSchema = z.strictObject({
  options: z.unknown(),
});

export const lobbySetReadySchema = z.strictObject({
  ready: z.boolean(),
});

export const lobbyStartSchema = z.strictObject({
  force: z.boolean(),
});

export const devRemoveBotSchema = z.strictObject({
  playerId: z.string().min(1).max(64),
});

/** Session token read from the handshake, never trusted before this check (règle d'or 1). */
export const handshakeAuthSchema = z.looseObject({
  sessionToken: z.string().min(1).max(128).optional(),
});
