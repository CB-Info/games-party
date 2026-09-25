import type { Point } from "../../../shared/cursor/collision";
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

/** What the recipient alone sees of themselves: what their prediction starts from (rules.md, §8). */
export interface CursorTagMe {
  lastProcessedSeq: number;
  /** Zero during a preparation. */
  budget: number;
  /** Their own cooldowns only: nobody else is concerned by them (rules.md, §6.4). */
  portalCooldownMs: Record<PortalPairId, number>;
  /** The catch-up remainder, `{ 0, 0 }` when the view carries none (rules.md, §6.2). */
  backlog: Point;
}

/** A player during a preparation: no cursor yet, only what the provisional scores need (§4.1). */
export interface PreparationViewPlayer {
  playerId: string;
  connected: boolean;
  scoreMs: number;
}

/** A player during a round. */
export interface RoundViewPlayer {
  playerId: string;
  x: number;
  y: number;
  role: Role;
  /** Zero when not frozen. */
  frozenMsLeft: number;
  connected: boolean;
  scoreMs: number;
}

export interface PreparationView {
  phase: "preparation";
  /** The round to come, from 1 to the number of rounds. */
  round: number;
  preparationStep: "waiting" | "countdown";
  /** Only during the waiting step. */
  autoStartMsLeft: number | null;
  /** Only during the countdown. */
  countdownMsLeft: number | null;
  readyPlayerIds: string[];
  players: PreparationViewPlayer[];
  /** Null for a spectator. */
  me: CursorTagMe | null;
}

export interface RoundView {
  phase: "round";
  round: number;
  roundTimeLeftMs: number;
  players: RoundViewPlayer[];
  /** Null for a spectator. */
  me: CursorTagMe | null;
}

/**
 * The view as the client and the bots read it, once `readView` has decoded it (rules.md, §8.1).
 * There is none once the game is over: the room shows the results instead.
 */
export type CursorTagView = PreparationView | RoundView;

/** A player in the compact view of a preparation: identifier, state bits, score. */
export type WirePreparationPlayer = [playerId: string, state: number, scoreMs: number];

/** A player in the compact view of a round: identifier, position, state bits, freeze, score. */
export type WireRoundPlayer = [
  playerId: string,
  x: number,
  y: number,
  state: number,
  frozenMsLeft: number,
  scoreMs: number,
];

/** `me` in the compact view: the remainder comes last, and only when it is not nil. */
export type WireMe =
  | [lastProcessedSeq: number, budget: number, cooldownA: number, cooldownB: number]
  | [
      lastProcessedSeq: number,
      budget: number,
      cooldownA: number,
      cooldownB: number,
      backlogX: number,
      backlogY: number,
    ];

/**
 * The view as it travels, thirty times a second to every player (rules.md, §8.2): one- or
 * two-letter keys and players as arrays of values, because it is the first item of the outgoing
 * traffic (architecture §7). `m` is left out for a spectator.
 */
export type CursorTagWireView =
  | { ph: 0; r: number; a: number; p: WirePreparationPlayer[]; m?: WireMe }
  | { ph: 0; r: number; c: number; p: WirePreparationPlayer[]; m?: WireMe }
  | { ph: 1; r: number; t: number; p: WireRoundPlayer[]; m?: WireMe };
