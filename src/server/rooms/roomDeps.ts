import type { RegisteredGame } from "../../games/defineGame";
import type { RoomOutbound } from "./roomOutbound";

export interface RoomDeps {
  code: string;
  outbound: RoomOutbound;
  findGame: (gameId: string) => RegisteredGame | null;
  random: () => number;
  now: () => number;
  /** Passed in so that tests can shorten them instead of waiting (docs/architecture.md, §5.5). */
  reconnectGraceMs?: number;
  resultsAutoReturnMs?: number;
}
