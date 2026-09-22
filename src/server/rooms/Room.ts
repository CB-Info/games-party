import type { ErrorCode } from "../../shared/protocol";
import type { PlayerColorId, RoomPreview, RoomState } from "../../shared/types";
import type { RoomBots } from "./RoomBots";
import type { RoomGameFlow } from "./RoomGameFlow";
import type { RoomMembers } from "./RoomMembers";
import type { JoinInput, JoinResult, RoomSeats } from "./RoomSeats";
import type { RoomMember } from "./roomMember";
import type { RoomDeps } from "./roomDeps";
import type { RoomOutbound } from "./roomOutbound";
import { createRoomParts } from "./roomParts";
import { snapshotOf, toRoomPreview, toRoomState, type RoomSnapshot } from "./roomProjection";

/** One room: who sits in it, and the game they are playing. */
export class Room {
  readonly code: string;
  private readonly outbound: RoomOutbound;
  private readonly members: RoomMembers;
  private readonly flow: RoomGameFlow;
  private readonly seats: RoomSeats;
  private readonly bots: RoomBots;

  constructor(deps: RoomDeps) {
    this.code = deps.code;
    this.outbound = deps.outbound;

    const parts = createRoomParts(deps, {
      isInGame: () => this.flow.status !== "lobby",
      gameInstance: () => this.flow.instance,
      afterRemoval: (playerId) => this.afterRemoval(playerId),
      removePlayer: (playerId) => this.remove(playerId),
      requireHostInLobby: (playerId) => this.requireHostInLobby(playerId),
      broadcast: () => this.broadcast(),
      afterMembershipChange: () => {
        this.flow.renormalizeOptions();
        this.broadcast();
      },
    });

    this.members = parts.members;
    this.flow = parts.flow;
    this.seats = parts.seats;
    this.bots = parts.bots;
  }

  get isEmpty(): boolean {
    return this.members.isEmpty;
  }

  /** When the room became empty, so the manager can delete it after its delay (§5.1). */
  get emptyAt(): number {
    return this.seats.emptyAt;
  }

  member(playerId: string): RoomMember | null {
    return this.members.find(playerId);
  }

  get hostId(): string | null {
    return this.members.host;
  }

  join(input: JoinInput): JoinResult {
    const result = this.seats.join(input);

    if (result.ok) {
      this.flow.renormalizeOptions();
      this.broadcast();
    }

    return result;
  }

  /** Development bots, host only (docs/architecture.md, §8). */
  addBot(requesterId: string): ErrorCode | null {
    return this.bots.add(requesterId);
  }

  removeBot(requesterId: string, playerId: string): ErrorCode | null {
    return this.bots.remove(requesterId, playerId);
  }

  disconnect(playerId: string): void {
    if (this.seats.disconnect(playerId)) {
      this.broadcast();
    }
  }

  reconnect(playerId: string): void {
    this.seats.reconnect(playerId);
    this.broadcast();
  }

  remove(playerId: string): void {
    if (this.seats.remove(playerId)) {
      this.broadcast();
    }
  }

  setColor(playerId: string, color: PlayerColorId): ErrorCode | null {
    if (this.flow.status !== "lobby") {
      return "INVALID_STATE";
    }

    if (!this.members.setColor(playerId, color)) {
      return "COLOR_TAKEN";
    }

    this.broadcast();
    return null;
  }

  setReady(playerId: string, ready: boolean): ErrorCode | null {
    const member = this.members.find(playerId);
    // The host agrees by starting the game, so the status means nothing for them (§5.8).
    if (this.flow.status !== "lobby" || member === null || playerId === this.members.host) {
      return "INVALID_STATE";
    }

    member.ready = ready;
    this.broadcast();
    return null;
  }

  selectGame(playerId: string, gameId: string): ErrorCode | null {
    return this.requireHostInLobby(playerId) ?? this.flow.selectGame(gameId);
  }

  setOptions(playerId: string, rawOptions: unknown): ErrorCode | null {
    return this.requireHostInLobby(playerId) ?? this.flow.setOptions(rawOptions);
  }

  start(playerId: string, force: boolean): ErrorCode | null {
    return playerId === this.members.host ? this.flow.start(force) : "NOT_HOST";
  }

  backToLobby(playerId: string): ErrorCode | null {
    return playerId === this.members.host ? this.flow.backToLobby() : "NOT_HOST";
  }

  /** A spectator watches without playing: the game never sees their input (§7). */
  handleInput(playerId: string, rawInput: unknown): void {
    if (!this.isSpectator(playerId)) {
      this.flow.queueInput(playerId, rawInput);
    }
  }

  handleAction(playerId: string, rawAction: unknown): ErrorCode | null {
    return this.isSpectator(playerId)
      ? "INVALID_STATE"
      : this.flow.applyAction(playerId, rawAction);
  }

  state(): RoomState {
    return toRoomState(this.snapshot());
  }

  preview(): RoomPreview {
    return toRoomPreview(this.snapshot());
  }

  /** Stops every timer, when the room is deleted. */
  dispose(): void {
    this.flow.dispose();
    this.seats.dispose();
  }

  private snapshot(): RoomSnapshot {
    return snapshotOf(this.code, this.members, this.flow);
  }

  private afterRemoval(playerId: string): void {
    this.flow.cumulative = this.flow.cumulative.filter((line) => line.playerId !== playerId);
    this.flow.renormalizeOptions();
    // A game may end outside a tick, and falls below its minimum here (§5.2, §6.3).
    this.flow.settleAfterRemoval();
  }

  private requireHostInLobby(playerId: string): ErrorCode | null {
    if (playerId !== this.members.host) {
      return "NOT_HOST";
    }

    return this.flow.status === "lobby" ? null : "INVALID_STATE";
  }

  private isSpectator(playerId: string): boolean {
    return this.members.find(playerId)?.isSpectator ?? false;
  }

  private broadcast(): void {
    this.outbound.roomState(this.state());
  }
}
