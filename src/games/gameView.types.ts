import type { GameViewPayload } from "../shared/types";

/**
 * The contract of the view buffer a game's screen is handed (docs/architecture.md, §7). It is
 * declared here, beside the game interface, and implemented in `client/engine/viewStore.ts`: the
 * engine may reach a game's types, a game may not reach the engine.
 */

/** One view, with the local moment it arrived. */
export interface ViewSample<View = unknown> {
  tick: number;
  /** The server's clock, as it stamped the view. */
  serverTime: number;
  /** The local clock, when the view reached this browser. */
  receivedAt: number;
  view: View;
}

/**
 * The two samples framing a moment, and how far between them it sits. Never a position: the store
 * cannot read a view, so the game's own code does the arithmetic.
 */
export interface ViewBracket<View = unknown> {
  from: ViewSample<View>;
  /** Null when the asked-for moment is past the last view received. */
  to: ViewSample<View> | null;
  /** Between 0 and 1, and always 0 when `to` is null. */
  t: number;
}

export interface ViewStore<View = unknown> {
  push: (payload: GameViewPayload, receivedAt: number) => void;
  latest: () => ViewSample<View> | null;
  /** `serverTime` is on the server's clock, like `GameViewPayload.serverTime` (§6.5). */
  sampleAt: (serverTime: number) => ViewBracket<View> | null;
  clear: () => void;
}
