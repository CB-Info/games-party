import type { AckStatus } from "../../shared/protocol";
import { fireAndForget, request } from "./delayedTransport";
import { getSocket } from "./socketClient";

/**
 * What a running game sends (docs/architecture.md, §6.2), and the two development events that add
 * or remove a bot (§8). One function per message, as everywhere else: a generic sender would lose
 * the payload types the protocol exists to enforce.
 */

/**
 * Thirty times a second while the cursor moves. Volatile: a late one is dropped, never queued.
 * The payload is the game's own shape, so it crosses as `unknown` and the server validates it
 * with the game's schema, as it does with every incoming message (règle d'or 3).
 */
export function sendGameInput(input: unknown): void {
  fireAndForget(() => getSocket().volatile.emit("game:input", input));
}

/** A one-off action, defined by the game. Reliable, unlike an input. */
export function sendGameAction(action: unknown): Promise<AckStatus> {
  return request(() => getSocket().emitWithAck("game:action", action));
}

export function addBot(): Promise<AckStatus> {
  return request(() => getSocket().emitWithAck("dev:addBot"));
}

export function removeBot(playerId: string): Promise<AckStatus> {
  return request(() => getSocket().emitWithAck("dev:removeBot", { playerId }));
}
