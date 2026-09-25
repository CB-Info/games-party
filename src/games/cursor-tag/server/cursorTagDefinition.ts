import { cursorInputSchema, type CursorInput } from "../../../shared/cursor/cursorInput";
import { defineGame, type RegisteredGame } from "../../defineGame";
import type { GameDefinition } from "../../gameServer.types";
import { defaultOptions, normalizeOptions, settingsFor } from "../logic/cursorTagOptions";
import { CURSOR_TAG_META } from "../shared/meta";
import {
  cursorTagActionSchema,
  cursorTagOptionsSchema,
  type CursorTagAction,
  type CursorTagOptions,
} from "../shared/schemas";
import type { CursorTagWireView } from "../shared/types";
import { CursorTagGame } from "./CursorTagGame";
import { cursorTagBot } from "./bot";

/**
 * Cursor Tag with its own types, before the registry erases them (docs/architecture.md, §7).
 * Exported as well, so that a test can replace one part of it and keep the rest.
 */
export const cursorTagDefinition: GameDefinition<
  CursorInput,
  CursorTagAction,
  CursorTagWireView,
  CursorTagOptions
> = {
  meta: CURSOR_TAG_META,
  inputSchema: cursorInputSchema,
  actionSchema: cursorTagActionSchema,
  optionsSchema: cursorTagOptionsSchema,
  // One Chat by default, whatever the number of players (rules.md, §3).
  defaultOptions: () => defaultOptions(),
  normalizeOptions,
  // The one place where the host's options become the settings the rules compute in.
  create: (ctx, options) => new CursorTagGame(ctx, settingsFor(options)),
  bot: cursorTagBot,
};

/** Cursor Tag, as the registry holds it. */
export const cursorTagGame: RegisteredGame = defineGame(cursorTagDefinition);
