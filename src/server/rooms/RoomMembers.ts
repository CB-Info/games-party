import type { GamePlayer } from "../../games/gameServer.types";
import { PLAYER_COLOR_IDS } from "../../shared/constants";
import type { PlayerColorId } from "../../shared/types";
import type { RoomMember } from "./roomMember";
import { electHost, isPseudoTaken, isRoomEmpty, pickColor } from "./roomPlayers";

export interface AddMemberInput {
  playerId: string;
  sessionToken: string;
  pseudo: string;
  preferredColor: PlayerColorId;
  isSpectator: boolean;
  joinedAt: number;
}

/** The members of a room and everything that only depends on that list. */
export class RoomMembers {
  private readonly members: RoomMember[] = [];
  private hostId: string | null = null;

  get all(): readonly RoomMember[] {
    return this.members;
  }

  /** Players counted for the minimum, the maximum and the options (docs/architecture.md, §5.3). */
  get counting(): RoomMember[] {
    return this.members.filter((member) => !member.isSpectator);
  }

  /** Watchers of the running game, who also receive a view at each tick (§6.3). */
  get connectedSpectatorIds(): string[] {
    return this.members
      .filter((member) => member.isSpectator && member.connected && !member.isBot)
      .map((member) => member.playerId);
  }

  get host(): string | null {
    return this.hostId;
  }

  get size(): number {
    return this.members.length;
  }

  get isEmpty(): boolean {
    return isRoomEmpty(this.members);
  }

  find(playerId: string): RoomMember | null {
    return this.members.find((member) => member.playerId === playerId) ?? null;
  }

  findByToken(sessionToken: string): RoomMember | null {
    return this.members.find((member) => member.sessionToken === sessionToken) ?? null;
  }

  isPseudoTaken(pseudo: string, exceptPlayerId?: string): boolean {
    return isPseudoTaken(this.members, pseudo, exceptPlayerId);
  }

  /** Adds a member with a free colour, or reports that no colour is left. */
  add(input: AddMemberInput): RoomMember | null {
    const color = pickColor(this.members, input.preferredColor);
    if (color === null) {
      return null;
    }

    const member: RoomMember = {
      playerId: input.playerId,
      sessionToken: input.sessionToken,
      pseudo: input.pseudo,
      color,
      isBot: false,
      connected: true,
      isSpectator: input.isSpectator,
      ready: false,
      points: 0,
      joinedAt: input.joinedAt,
    };

    this.members.push(member);
    this.reelectHost();
    return member;
  }

  /**
   * Adds a development bot (docs/architecture.md, §8). It takes a colour and a seat like anyone
   * else, and its pseudo is the first `Bot n` still free, so that removing Bot 1 and adding one
   * back does not produce two Bot 2.
   */
  addBot(playerId: string, sessionToken: string, joinedAt: number): RoomMember | null {
    const member = this.add({
      playerId,
      sessionToken,
      pseudo: this.freeBotPseudo(),
      preferredColor: PLAYER_COLOR_IDS[0],
      isSpectator: false,
      joinedAt,
    });

    if (member !== null) {
      member.isBot = true;
      // A bot is always ready: it has nobody to wait for, and Cursor Tag has it declare itself
      // ready as soon as a preparation starts (rules.md, §4.1). Without this the host would have
      // to click "Lancer quand même" in a room of bots, for no reason.
      member.ready = true;
      // A bot is never a host, so the election has to run again now that the flag is set (§5.3).
      this.reelectHost();
    }

    return member;
  }

  remove(playerId: string): RoomMember | null {
    const index = this.members.findIndex((member) => member.playerId === playerId);
    if (index === -1) {
      return null;
    }

    const [removed] = this.members.splice(index, 1);
    this.reelectHost();
    return removed ?? null;
  }

  /** Takes a free colour, or reports that another member already holds it (§4). */
  setColor(playerId: string, color: PlayerColorId): boolean {
    const taken = this.members.some(
      (member) => member.playerId !== playerId && member.color === color,
    );
    const member = this.find(playerId);

    if (taken || member === null) {
      return false;
    }

    member.color = color;
    return true;
  }

  private freeBotPseudo(): string {
    for (let index = 1; index <= this.members.length + 1; index += 1) {
      const candidate = `Bot ${index}`;
      if (!this.isPseudoTaken(candidate)) {
        return candidate;
      }
    }

    return `Bot ${this.members.length + 1}`;
  }

  /** The host is re-elected on every change, so that the role never sits on a missing player. */
  reelectHost(): void {
    this.hostId = electHost(this.members);
  }

  /** Everyone starts a lobby not ready, except the bots, which never stop being (§5.8, §8). */
  clearReady(): void {
    for (const member of this.members) {
      member.ready = member.isBot;
    }
  }

  /** Spectators become players again when the room returns to the lobby (§5.4). */
  promoteSpectators(): void {
    for (const member of this.members) {
      member.isSpectator = false;
    }
  }

  /** The game's live player list: everyone still in it, spectators excluded (§7). */
  toGamePlayers(): GamePlayer[] {
    return this.counting.map((member) => ({
      playerId: member.playerId,
      color: member.color,
      isBot: member.isBot,
      connected: member.connected,
    }));
  }
}
