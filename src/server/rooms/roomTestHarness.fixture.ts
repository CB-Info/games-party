import { fakeGame, otherFakeGame } from "../../games/fakeGame.fixture";
import type { GameEvent } from "../../shared/protocol";
import type { GameResults, GameViewPayload, PlayerColorId, RoomState } from "../../shared/types";
import { RoomManager } from "./RoomManager";
import type { RoomOutbound } from "./roomOutbound";

/** Records everything a room sends, so that tests read it instead of a network (§6.2). */
export class RecordingOutbound implements RoomOutbound {
  readonly states: RoomState[] = [];
  readonly gameChanges: Array<{ playerIds: string[]; gameId: string }> = [];
  readonly views: Array<{ playerId: string; payload: GameViewPayload }> = [];
  readonly events: Array<{ event: GameEvent; playerIds?: string[] }> = [];
  readonly results: GameResults[] = [];

  roomState(state: RoomState): void {
    this.states.push(state);
  }

  gameChanged(playerIds: string[], gameId: string): void {
    this.gameChanges.push({ playerIds, gameId });
  }

  gameView(playerId: string, payload: GameViewPayload): void {
    this.views.push({ playerId, payload });
  }

  gameEvent(event: GameEvent, playerIds?: string[]): void {
    this.events.push(playerIds === undefined ? { event } : { event, playerIds });
  }

  gameResults(results: GameResults): void {
    this.results.push(results);
  }

  get lastState(): RoomState | undefined {
    return this.states.at(-1);
  }
}

let nextId = 0;

/**
 * A room holding the two fake games, with deterministic randomness. The clock follows the fake
 * timers of the test, so that advancing them also advances the game's own time.
 */
export function createTestRoom(overrides: Partial<{ now: () => number }> = {}) {
  const outbound = new RecordingOutbound();
  const manager = new RoomManager({
    outboundFor: () => outbound,
    findGame: (gameId) => [fakeGame, otherFakeGame].find((game) => game.id === gameId) ?? null,
    random: () => 0.5,
    now: overrides.now ?? (() => Date.now()),
  });

  const room = manager.create();
  if (room === null) {
    throw new Error("The manager refused to create a room");
  }

  return { manager, room, outbound };
}

/** Adds a member with a unique session and pseudo, and returns their player id. */
export function addPlayer(
  room: ReturnType<typeof createTestRoom>["room"],
  pseudo: string,
  preferredColor: PlayerColorId = "c1",
): string {
  nextId += 1;
  const playerId = `player-${nextId}`;
  const result = room.join({
    playerId,
    sessionToken: `token-${playerId}`,
    pseudo,
    preferredColor,
  });

  if (!result.ok) {
    throw new Error(`Join refused: ${result.error}`);
  }

  return result.member.playerId;
}
