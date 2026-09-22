import { nanoid } from "nanoid";

import { SESSION_PLAYER_ID_LENGTH } from "../../shared/constants";
import type { ErrorCode } from "../../shared/protocol";
import type { RoomMembers } from "./RoomMembers";
import type { RoomSeats } from "./RoomSeats";

export interface RoomBotsDeps {
  members: RoomMembers;
  seats: RoomSeats;
  /** Refuses anyone but the host, and anything but the lobby (§5.3). */
  requireHostInLobby: (playerId: string) => ErrorCode | null;
  /** The room's own removal, which tells the game and broadcasts (§5.5). */
  removePlayer: (playerId: string) => void;
  /** Options depend on the player count, and the others must see the new list (§5.3). */
  onChange: () => void;
}

/**
 * The development bots of a room (docs/architecture.md, §8). Kept apart from `Room` because it is
 * the only part of a room that exists for us and not for the players.
 */
export class RoomBots {
  private readonly deps: RoomBotsDeps;

  constructor(deps: RoomBotsDeps) {
    this.deps = deps;
  }

  /** In the lobby only: during a game a newcomer is a spectator (§5.4), and a bot would sit idle. */
  add(requesterId: string): ErrorCode | null {
    const refusal = this.deps.requireHostInLobby(requesterId);
    if (refusal !== null) {
      return refusal;
    }

    const playerId = nanoid(SESSION_PLAYER_ID_LENGTH);
    // Its own shape of token, which no browser can present: a bot has no session to take back.
    const result = this.deps.seats.addBot(playerId, `bot:${playerId}`);
    if (!result.ok) {
      return result.error;
    }

    this.deps.onChange();
    return null;
  }

  /** At any moment: the panel sits in the lobby, but a game may have started since (§8). */
  remove(requesterId: string, playerId: string): ErrorCode | null {
    if (requesterId !== this.deps.members.host) {
      return "NOT_HOST";
    }

    if (this.deps.members.find(playerId)?.isBot !== true) {
      return "INVALID_STATE";
    }

    this.deps.removePlayer(playerId);
    return null;
  }
}
