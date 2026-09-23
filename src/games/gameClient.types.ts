import type { ComponentType } from "react";

import type { PlayerColorId } from "../shared/types";
import type { GameMeta } from "./gameMeta";
import type { ViewStore } from "./gameView.types";

/** What a game's screen is given to run (docs/architecture.md, §7). */
export interface GameScreenProps {
  /** The views received, read by the render loop without ever going through React state. */
  viewStore: ViewStore;
  /** The cursor's movement for this frame, already in arena units. */
  sendInput: (input: unknown) => void;
  sendAction: (action: unknown) => Promise<{ ok: boolean }>;
  /** A spectator watches without playing: the game never receives their input (§7). */
  me: { playerId: string } | { spectator: true };
  /**
   * The game's own options, as the room broadcasts them. They come this way rather than in the
   * view because they change in the lobby and never during a tick: sending them thirty times a
   * second would pay for something that does not move (§7, vue compacte).
   */
  options: unknown;
  /** The players of the room, for pseudos and colours: they are not in the view (§7). */
  players: ReadonlyArray<{ playerId: string; pseudo: string; color: PlayerColorId }>;
  /**
   * Leaves the room, with its confirmation. The screen owns what is laid over the arena — the
   * veil is the only way to put anything there (§11.19) — so it owns the button §11.18 puts on it.
   */
  onLeave: () => void;
}

/** The options form the host edits in the lobby (docs/design-system.md, §13). */
export interface GameOptionsFormProps {
  options: unknown;
  playerCount: number;
  /** Only the host may change them (docs/architecture.md, §5.3). */
  editable: boolean;
  onChange: (options: unknown) => void;
}

/**
 * Everything the client needs to offer a game and to play it. Its boundaries are in `unknown`,
 * like `RegisteredGame` on the server: the room holds games whose input, action, view and option
 * types differ, and each game narrows what it knows inside its own components. Unlike the server
 * there is nothing to validate here — a view comes from our own server, not from the network.
 */
export interface GameClientDefinition {
  /** Declared once, in `games/<id>/shared/meta.ts`, and read by both definitions (§7). */
  meta: GameMeta;
  /** The 48 px mark of the game card and of the "Le jeu" column (§11.7). */
  Icon: ComponentType;
  /** The still picture shown in the lobby beside the settings, never the live arena (§13). */
  Preview: ComponentType;
  /** The game's own sentence in the "Le jeu" column, for instance its scoring rule (§13). */
  scoreHint: string;
  Screen: ComponentType<GameScreenProps>;
  /** Null when the game has no option to set. */
  OptionsForm: ComponentType<GameOptionsFormProps> | null;
}
