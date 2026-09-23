import type { GameResults, GameViewPayload, PlayerColorId, RoomPreview, RoomState } from "./types";

/** Every reason a request can be refused (docs/architecture.md, §6.1). */
export type ErrorCode =
  | "INVALID_PAYLOAD"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "SERVER_FULL"
  | "PSEUDO_TAKEN"
  | "COLOR_TAKEN"
  | "NOT_HOST"
  | "INVALID_STATE"
  | "NOT_ENOUGH_PLAYERS"
  | "TOO_MANY_PLAYERS"
  | "NO_GAME_SELECTED"
  | "NOT_ALL_READY"
  | "RATE_LIMITED";

/** Answer of a request that carries data when it succeeds (docs/architecture.md, §6.1). */
export type AckResponse<Data> = { ok: true; data: Data } | { ok: false; error: ErrorCode };

/** Answer of a request that only reports success or failure (docs/architecture.md, §6.1). */
export type AckStatus = { ok: true } | { ok: false; error: ErrorCode };

/** Both `room:create` and `room:join` answer with the code; the state follows in `room:state`. */
export interface RoomCodeData {
  code: string;
}

/** A game defines its own event payloads; only the type is common (docs/architecture.md, §7). */
export type GameEvent = { readonly type: string } & Readonly<Record<string, unknown>>;

export interface ClientToServerEvents {
  "room:create": (
    payload: { pseudo: string; preferredColor: PlayerColorId },
    ack: (response: AckResponse<RoomCodeData>) => void,
  ) => void;
  "room:preview": (
    payload: { code: string },
    ack: (response: AckResponse<RoomPreview>) => void,
  ) => void;
  "room:join": (
    payload: { code: string; pseudo: string; preferredColor: PlayerColorId },
    ack: (response: AckResponse<RoomCodeData>) => void,
  ) => void;
  "room:leave": () => void;

  "lobby:setColor": (payload: { color: PlayerColorId }, ack: (r: AckStatus) => void) => void;
  "lobby:selectGame": (payload: { gameId: string }, ack: (r: AckStatus) => void) => void;
  "lobby:setOptions": (payload: { options: unknown }, ack: (r: AckStatus) => void) => void;
  "lobby:setReady": (payload: { ready: boolean }, ack: (r: AckStatus) => void) => void;
  "lobby:start": (payload: { force: boolean }, ack: (r: AckStatus) => void) => void;
  "results:backToLobby": (ack: (r: AckStatus) => void) => void;

  // Development only (docs/architecture.md, §8): outside a development build the server refuses
  // both rather than staying silent, so a caller is never left waiting on an acknowledgement.
  "dev:addBot": (ack: (r: AckStatus) => void) => void;
  "dev:removeBot": (payload: { playerId: string }, ack: (r: AckStatus) => void) => void;

  /** Continuous input, defined by the game. Volatile: a late message is dropped. */
  "game:input": (payload: unknown) => void;
  /** One-off action, defined by the game. Reliable. */
  "game:action": (payload: unknown, ack: (r: AckStatus) => void) => void;
}

export interface ServerToClientEvents {
  "session:init": (payload: { sessionToken: string; playerId: string }) => void;
  "session:replaced": () => void;
  "room:state": (state: RoomState) => void;
  "lobby:gameChanged": (payload: { gameId: string }) => void;
  "game:view": (payload: GameViewPayload) => void;
  "game:event": (event: GameEvent) => void;
  "game:results": (results: GameResults) => void;
}

/** No server-to-server event: Games Party runs in a single process (docs/architecture.md, §1). */
export type InterServerEvents = Record<string, never>;

/** Bound to each socket by the session middleware, never sent by the client (règle d'or 1). */
export interface SocketData {
  sessionToken: string;
  playerId: string;
}
