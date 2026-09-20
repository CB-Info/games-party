import { ROOM_CAPACITY } from "../../shared/constants";
import type { Player, RoomPreview, RoomState, RoomStatus } from "../../shared/types";
import type { GameResults } from "../../shared/types";
import type { RoomMember } from "./roomMember";

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  hostId: string | null;
  members: readonly RoomMember[];
  selectedGameId: string | null;
  selectedGameOptions: unknown;
  cumulative: RoomState["cumulative"];
  lastResults: GameResults | null;
}

function toPlayer(member: RoomMember, hostId: string | null): Player {
  return {
    playerId: member.playerId,
    pseudo: member.pseudo,
    color: member.color,
    isHost: member.playerId === hostId,
    isBot: member.isBot,
    connected: member.connected,
    isSpectator: member.isSpectator,
  };
}

/** The whole room state, as every member receives it (docs/architecture.md, §6.2). */
export function toRoomState(snapshot: RoomSnapshot): RoomState {
  return {
    code: snapshot.code,
    status: snapshot.status,
    hostId: snapshot.hostId,
    players: snapshot.members.map((member) => toPlayer(member, snapshot.hostId)),
    selectedGameId: snapshot.selectedGameId,
    selectedGameOptions: snapshot.selectedGameOptions,
    readyPlayerIds: snapshot.members
      .filter((member) => member.ready)
      .map((member) => member.playerId),
    cumulative: snapshot.cumulative,
    lastResults: snapshot.lastResults,
  };
}

/**
 * Snapshot of a room for the invitation screen. It carries no identifier, no timer, no role and no
 * score: someone who has not joined yet learns nothing about the game (docs/architecture.md, §5.7).
 */
export function toRoomPreview(snapshot: RoomSnapshot): RoomPreview {
  const host = snapshot.members.find((member) => member.playerId === snapshot.hostId);

  return {
    hostPseudo: host?.pseudo ?? null,
    players: snapshot.members.map((member) => ({
      pseudo: member.pseudo,
      color: member.color,
      isHost: member.playerId === snapshot.hostId,
    })),
    playerCount: snapshot.members.length,
    capacity: ROOM_CAPACITY,
    status: snapshot.status === "lobby" ? "lobby" : "in_game",
    selectedGameId: snapshot.selectedGameId,
  };
}
