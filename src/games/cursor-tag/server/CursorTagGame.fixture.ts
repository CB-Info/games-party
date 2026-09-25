import { SERVER_TICK_RATE } from "../../../shared/constants";
import type { Point } from "../../../shared/cursor/collision";
import type { GameEvent } from "../../../shared/protocol";
import type { GameContext, GamePlayer } from "../../gameServer.types";
import { defaultOptions, settingsFor, type TagSettings } from "../logic/cursorTagOptions";
import { readView } from "../logic/readView";
import type { CursorTagView, RoundView } from "../shared/types";
import { CursorTagGame } from "./CursorTagGame";

/**
 * A room around one game of Cursor Tag, for the tests of the game class. Never imported by
 * production code. The room's side is played the way the real one plays it: a player's connection
 * changes before the game hears of it, and a player who leaves is gone from the list first.
 */

export const TICK_MS = 1000 / SERVER_TICK_RATE;

/** A short game: rounds of two seconds, a freeze of half a second. */
export const QUICK: TagSettings = {
  ...settingsFor(defaultOptions()),
  roundMs: 2000,
  freezeMs: 500,
};

export interface TestRoom {
  readonly game: CursorTagGame;
  /** Every event the game sent, in order. */
  readonly events: GameEvent[];
  /** The recipients of each event, `undefined` for the whole room. */
  readonly recipients: Array<string[] | undefined>;
  disconnect(playerId: string): void;
  reconnect(playerId: string): void;
  leave(playerId: string): void;
  /** What a player of the game sees, read back from the compact view. */
  viewOf(playerId: string): CursorTagView;
  /** Ticks until `done`, and fails the test past `maxTicks`. */
  tickUntil(done: () => boolean, maxTicks: number): void;
  eventsOfType(type: string): GameEvent[];
}

export function openRoom(
  playerIds: readonly string[],
  options: { bots?: readonly string[]; settings?: TagSettings } = {},
): TestRoom {
  const players: GamePlayer[] = playerIds.map((playerId) => ({
    playerId,
    color: "c1",
    isBot: options.bots?.includes(playerId) ?? false,
    connected: true,
  }));
  const events: GameEvent[] = [];
  const recipients: Array<string[] | undefined> = [];

  const ctx: GameContext = {
    players: () => players,
    emitEvent: (event, to) => {
      events.push(event);
      recipients.push(to);
    },
    getHostId: () => playerIds[0] ?? null,
    // Fixed, so that spawn points and Chats are drawn the same way in every run (règle d'or 7).
    random: () => 0.42,
  };
  const game = new CursorTagGame(ctx, options.settings ?? QUICK);

  const setConnected = (playerId: string, connected: boolean): void => {
    const player = players.find((candidate) => candidate.playerId === playerId);
    if (player !== undefined) {
      player.connected = connected;
    }
  };

  return {
    game,
    events,
    recipients,
    disconnect: (playerId) => {
      setConnected(playerId, false);
      game.onPlayerDisconnect(playerId);
    },
    reconnect: (playerId) => {
      setConnected(playerId, true);
      game.onPlayerReconnect(playerId);
    },
    leave: (playerId) => {
      players.splice(
        players.findIndex((player) => player.playerId === playerId),
        1,
      );
      game.onPlayerLeave(playerId);
    },
    viewOf: (playerId) => readView(game.getViewFor({ playerId })),
    tickUntil: (done, maxTicks) => {
      for (let ticks = 0; !done(); ticks += 1) {
        if (ticks >= maxTicks) {
          throw new Error(`still not there after ${maxTicks} ticks`);
        }
        game.tick(TICK_MS);
      }
    },
    eventsOfType: (type) => events.filter((event) => event.type === type),
  };
}

/** Everyone ready, then the countdown played out: the first round has begun. */
export function startRound(room: TestRoom, playerIds: readonly string[]): RoundView {
  for (const playerId of playerIds) {
    room.game.onAction(playerId, { type: "ready" });
  }
  room.tickUntil(() => room.eventsOfType("roundStart").length > 0, 200);

  return roundViewOf(room, playerIds[0] ?? "");
}

/** The view of a round, which a test expects to be one. */
export function roundViewOf(room: TestRoom, playerId: string): RoundView {
  const view = room.viewOf(playerId);
  if (view.phase !== "round") {
    throw new Error(`expected a round, got the ${view.phase} phase`);
  }
  return view;
}

/** Where a player stands, read from a round's view. */
export function positionOf(view: RoundView, playerId: string): Point {
  const player = view.players.find((candidate) => candidate.playerId === playerId);
  if (player === undefined) {
    throw new Error(`${playerId} is not in the round`);
  }
  return { x: player.x, y: player.y };
}

/** The Chats a round began with, from its `roundStart`. */
export function chatsOf(room: TestRoom): string[] {
  const start = room.eventsOfType("roundStart").at(-1);
  return Array.isArray(start?.chatIds) ? start.chatIds.map(String) : [];
}

/**
 * Moves a player straight at `target`, one input per tick, as far as `lengthOf` allows, until it
 * returns null or the player goes through a portal.
 */
export function walk(
  room: TestRoom,
  playerId: string,
  target: Point,
  lengthOf: (distance: number, budget: number) => number | null,
): void {
  for (let seq = 0; seq < 200; seq += 1) {
    const view = roundViewOf(room, playerId);
    const from = positionOf(view, playerId);
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    const length = lengthOf(distance, view.me?.budget ?? 0);
    if (length === null) {
      return;
    }

    const ratio = length / distance;
    room.game.onInput(playerId, {
      seq,
      dx: (target.x - from.x) * ratio,
      dy: (target.y - from.y) * ratio,
    });
    if (room.eventsOfType("portal").length > 0) {
      return;
    }
    room.game.tick(TICK_MS);
  }
  throw new Error(`${playerId} never got there`);
}
