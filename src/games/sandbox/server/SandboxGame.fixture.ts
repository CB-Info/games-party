import type { GameContext, GamePlayer } from "../../gameServer.types";
import { SANDBOX_CATCH_UP_MS_DEFAULT, SANDBOX_SPEED_DEFAULT } from "../shared/constants";
import type { SandboxView } from "../shared/types";
import type { SandboxGame } from "./SandboxGame";

const DURATION_S = 60;
export const OPTIONS = {
  durationS: DURATION_S,
  maxSpeed: SANDBOX_SPEED_DEFAULT,
  catchUpMs: SANDBOX_CATCH_UP_MS_DEFAULT,
};

export function contextOver(players: GamePlayer[]): GameContext {
  return {
    players: () => players,
    emitEvent: () => undefined,
    getHostId: () => players[0]?.playerId ?? null,
    // Fixed, so that spawn points are dealt the same way in every run (règle d'or 7).
    random: () => 0.42,
  };
}

export function person(playerId: string, connected = true): GamePlayer {
  return { playerId, color: "c1", isBot: false, connected };
}

export function viewOf(game: SandboxGame, playerId: string): SandboxView {
  return game.getViewFor({ playerId });
}
