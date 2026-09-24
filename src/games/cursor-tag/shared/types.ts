import type { PortalPairId } from "./map";

/** What a player is during a round (rules.md, §6.1). */
export type Role = "chat" | "runner";

/** A round begins, with the Chats it drew (rules.md, §4). */
export type RoundStartEvent = { type: "roundStart"; round: number; chatIds: string[] };

/** A round ends: its time ran out, or no Runner is left (rules.md, §4). */
export type RoundEndEvent = { type: "roundEnd"; round: number };

/** A Chat tagged a Runner (rules.md, §6.3). */
export type TagEvent = { type: "tag"; chatId: string; taggedId: string };

/** A player went through a portal (rules.md, §6.4). */
export type PortalEvent = { type: "portal"; playerId: string; pair: PortalPairId };

/** A connected Runner took the place of a Chat who left or lost their connection (rules.md, §11). */
export type ChatReplacedEvent = { type: "chatReplaced"; previousChatId: string; newChatId: string };

/** A player became ready, or no longer is, during a preparation (rules.md, §4.1). */
export type ReadyChangedEvent = { type: "readyChanged"; playerId: string; ready: boolean };

/** The countdown of a preparation began; `auto` when the waiting ran out (rules.md, §4.1). */
export type PreparationCountdownEvent = {
  type: "preparationCountdown";
  round: number;
  auto: boolean;
};

/**
 * Every `game:event` of Cursor Tag (rules.md, §9), all sent to the whole room. Type aliases rather
 * than interfaces: an interface has no index signature, and could not be sent as a `GameEvent`.
 */
export type CursorTagEvent =
  | RoundStartEvent
  | RoundEndEvent
  | TagEvent
  | PortalEvent
  | ChatReplacedEvent
  | ReadyChangedEvent
  | PreparationCountdownEvent;
