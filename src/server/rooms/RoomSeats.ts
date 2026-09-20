import { RECONNECT_GRACE_MS, ROOM_CAPACITY } from "../../shared/constants";
import type { ErrorCode } from "../../shared/protocol";
import type { PlayerColorId } from "../../shared/types";
import type { GameInstance } from "../../games/gameServer.types";
import type { RoomMembers } from "./RoomMembers";
import type { RoomMember } from "./roomMember";

export interface RoomSeatsDeps {
  members: RoomMembers;
  now: () => number;
  /** True while a game is running, so that a newcomer arrives as a spectator (§5.4). */
  isInGame: () => boolean;
  /** The running game, notified of every membership change (§5.5). */
  gameInstance: () => GameInstance<unknown, unknown, unknown> | null;
  /** Called after a player was removed for good, before the room broadcasts. */
  onRemoved: (playerId: string) => void;
  /** The grace delay ran out: the room removes the player, and tells everyone (§5.5). */
  onGraceExpired: (playerId: string) => void;
  /** Passed in so that tests can shorten it instead of waiting. */
  reconnectGraceMs?: number;
}

export type JoinResult = { ok: true; member: RoomMember } | { ok: false; error: ErrorCode };

export interface JoinInput {
  playerId: string;
  sessionToken: string;
  pseudo: string;
  preferredColor: PlayerColorId;
}

/** Who holds a seat in a room, and for how long after they disappear (docs/architecture.md, §5.5). */
export class RoomSeats {
  private readonly deps: RoomSeatsDeps;
  private readonly removalTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private emptySince: number;

  constructor(deps: RoomSeatsDeps) {
    this.deps = deps;
    // A room is empty from the moment it opens: one created and never joined must expire too.
    this.emptySince = deps.now();
  }

  /** When the room became empty, so that the manager can delete it after its delay (§5.1). */
  get emptyAt(): number {
    return this.emptySince;
  }

  /** Adds a newcomer, or gives their seat back when the session already holds one. */
  join(input: JoinInput): JoinResult {
    const existing = this.deps.members.findByToken(input.sessionToken);
    if (existing !== null) {
      this.reconnect(existing.playerId);
      return { ok: true, member: existing };
    }

    if (this.deps.members.size >= ROOM_CAPACITY) {
      return { ok: false, error: "ROOM_FULL" };
    }

    if (this.deps.members.isPseudoTaken(input.pseudo)) {
      return { ok: false, error: "PSEUDO_TAKEN" };
    }

    const member = this.deps.members.add({
      playerId: input.playerId,
      sessionToken: input.sessionToken,
      pseudo: input.pseudo,
      preferredColor: input.preferredColor,
      isSpectator: this.deps.isInGame(),
      joinedAt: this.deps.now(),
    });

    if (member === null) {
      return { ok: false, error: "ROOM_FULL" };
    }

    return { ok: true, member };
  }

  /** Marks a player away and keeps their seat for the grace delay. */
  disconnect(playerId: string): boolean {
    const member = this.deps.members.find(playerId);
    if (member === null || !member.connected) {
      return false;
    }

    member.connected = false;
    member.ready = false;
    this.deps.members.reelectHost();
    this.deps.gameInstance()?.onPlayerDisconnect(playerId);

    const delay = this.deps.reconnectGraceMs ?? RECONNECT_GRACE_MS;
    this.removalTimers.set(
      playerId,
      setTimeout(() => this.deps.onGraceExpired(playerId), delay),
    );
    return true;
  }

  /** Gives a seat back to a player who came back within the grace delay. */
  reconnect(playerId: string): void {
    const member = this.deps.members.find(playerId);
    if (member === null) {
      return;
    }

    this.clearRemovalTimer(playerId);

    if (!member.connected) {
      member.connected = true;
      this.deps.members.reelectHost();
      this.deps.gameInstance()?.onPlayerReconnect(playerId);
    }
  }

  /** Removes a player for good: on `room:leave`, or at the end of the grace delay. */
  remove(playerId: string): boolean {
    this.clearRemovalTimer(playerId);

    if (this.deps.members.remove(playerId) === null) {
      return false;
    }

    this.deps.gameInstance()?.onPlayerLeave(playerId);

    if (this.deps.members.isEmpty) {
      this.emptySince = this.deps.now();
    }

    this.deps.onRemoved(playerId);
    return true;
  }

  dispose(): void {
    for (const timer of this.removalTimers.values()) {
      clearTimeout(timer);
    }
    this.removalTimers.clear();
  }

  private clearRemovalTimer(playerId: string): void {
    const timer = this.removalTimers.get(playerId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.removalTimers.delete(playerId);
    }
  }
}
