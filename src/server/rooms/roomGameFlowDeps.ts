import type { RegisteredGame } from "../../games/defineGame";
import type { RoomMembers } from "./RoomMembers";
import type { RoomOutbound } from "./roomOutbound";

export interface RoomGameFlowDeps {
  members: RoomMembers;
  outbound: RoomOutbound;
  findGame: (gameId: string) => RegisteredGame | null;
  random: () => number;
  now: () => number;
  /** Called whenever the room state changed and must be broadcast. */
  onChange: () => void;
  /** Passed in so that tests can shorten it instead of waiting. */
  resultsAutoReturnMs?: number;
}
