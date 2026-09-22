import type { GameInstance } from "../../games/gameServer.types";
import { RoomGameFlow } from "./RoomGameFlow";
import { RoomMembers } from "./RoomMembers";
import { RoomSeats } from "./RoomSeats";
import type { RoomDeps } from "./roomDeps";

/**
 * What the parts of a room need from the room itself. They are functions rather than values
 * because they are called later: the seats ask the flow whether a game is running, and the flow is
 * being built at the same moment.
 */
export interface RoomHooks {
  isInGame: () => boolean;
  gameInstance: () => GameInstance<unknown, unknown, unknown> | null;
  /** After a player was removed for good, before the room broadcasts. */
  afterRemoval: (playerId: string) => void;
  /** The room's own removal, which tells the game and broadcasts (§5.5). */
  removePlayer: (playerId: string) => void;
  broadcast: () => void;
}

export interface RoomParts {
  members: RoomMembers;
  flow: RoomGameFlow;
  seats: RoomSeats;
}

/**
 * Builds the parts of a room and wires them to each other. Kept out of `Room` so that the
 * class holds its rules and nothing else: this is assembly, and it reads better on its own.
 */
export function createRoomParts(deps: RoomDeps, hooks: RoomHooks): RoomParts {
  const members = new RoomMembers();

  const flow = new RoomGameFlow({
    members,
    outbound: deps.outbound,
    findGame: deps.findGame,
    random: deps.random,
    now: deps.now,
    onChange: hooks.broadcast,
    resultsAutoReturnMs: deps.resultsAutoReturnMs,
  });

  const seats = new RoomSeats({
    members,
    now: deps.now,
    isInGame: hooks.isInGame,
    gameInstance: hooks.gameInstance,
    onRemoved: hooks.afterRemoval,
    onGraceExpired: hooks.removePlayer,
    ...(deps.reconnectGraceMs === undefined ? {} : { reconnectGraceMs: deps.reconnectGraceMs }),
  });

  return { members, flow, seats };
}
