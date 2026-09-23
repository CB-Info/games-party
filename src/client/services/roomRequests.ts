import type { AckResponse, AckStatus, RoomCodeData } from "../../shared/protocol";
import type { PlayerColorId, RoomPreview } from "../../shared/types";
import { roomState } from "./roomState";
import { fireAndForget, request } from "./delayedTransport";
import { getSocket } from "./socketClient";

/**
 * Every request the client sends, one function per event. A generic wrapper would lose the payload
 * and answer types, which are exactly what the protocol is for (docs/architecture.md, §6.2).
 */

export function createRoom(payload: {
  pseudo: string;
  preferredColor: PlayerColorId;
}): Promise<AckResponse<RoomCodeData>> {
  return request(() => getSocket().emitWithAck("room:create", payload));
}

export function previewRoom(code: string): Promise<AckResponse<RoomPreview>> {
  return request(() => getSocket().emitWithAck("room:preview", { code }));
}

export function joinRoom(payload: {
  code: string;
  pseudo: string;
  preferredColor: PlayerColorId;
}): Promise<AckResponse<RoomCodeData>> {
  return request(() => getSocket().emitWithAck("room:join", payload));
}

/**
 * The server never answers this one (docs/architecture.md, §6.2), so the room has to be forgotten
 * here: nothing will come back to say it is gone.
 */
export function leaveRoom(): void {
  roomState.forget();
  fireAndForget(() => getSocket().emit("room:leave"));
}

export function setColor(color: PlayerColorId): Promise<AckStatus> {
  return request(() => getSocket().emitWithAck("lobby:setColor", { color }));
}

export function selectGame(gameId: string): Promise<AckStatus> {
  return request(() => getSocket().emitWithAck("lobby:selectGame", { gameId }));
}

export function setGameOptions(options: unknown): Promise<AckStatus> {
  return request(() => getSocket().emitWithAck("lobby:setOptions", { options }));
}

export function setReady(ready: boolean): Promise<AckStatus> {
  return request(() => getSocket().emitWithAck("lobby:setReady", { ready }));
}

export function startGame(force: boolean): Promise<AckStatus> {
  return request(() => getSocket().emitWithAck("lobby:start", { force }));
}
