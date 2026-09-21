import { nanoid } from "nanoid";

import {
  SESSION_PLAYER_ID_LENGTH,
  SESSION_TOKEN_LENGTH,
  SESSION_TTL_MS,
} from "../../shared/constants";

/** A browser's identity, kept across page reloads (docs/architecture.md, §4). */
export interface Session {
  /** Secret, never sent to another client nor written to the logs. */
  token: string;
  /** Public identity, the only one other players ever see. */
  playerId: string;
  /** Code of the room this session sits in, or null. */
  roomCode: string | null;
  /** Id of the socket currently holding this session, or null. */
  socketId: string | null;
  /** Last time the session was bound to a socket, in milliseconds. */
  lastSeenAt: number;
}

interface SessionStoreOptions {
  /** How long a session with no socket and no room is kept, in milliseconds. */
  ttlMs?: number;
}

/** Opening a session that was already open elsewhere reports the socket to disconnect. */
export interface OpenedSession {
  session: Session;
  /** Socket that held this session and must be told it was replaced (docs/architecture.md, §4). */
  replacedSocketId: string | null;
}

export class SessionStore {
  private readonly byToken = new Map<string, Session>();
  private readonly ttlMs: number;

  constructor({ ttlMs = SESSION_TTL_MS }: SessionStoreOptions = {}) {
    this.ttlMs = ttlMs;
  }

  /**
   * Binds a socket to the session of `token`, or opens a new one when the token is missing or
   * unknown. A session already held by another socket changes hands: the new socket takes the seat
   * and the old one is reported so that the caller can disconnect it.
   */
  open(token: string | undefined, socketId: string, now: number): OpenedSession {
    const existing = token === undefined ? undefined : this.byToken.get(token);

    if (existing === undefined) {
      const session: Session = {
        token: nanoid(SESSION_TOKEN_LENGTH),
        playerId: nanoid(SESSION_PLAYER_ID_LENGTH),
        roomCode: null,
        socketId,
        lastSeenAt: now,
      };
      this.byToken.set(session.token, session);
      return { session, replacedSocketId: null };
    }

    const replacedSocketId =
      existing.socketId !== null && existing.socketId !== socketId ? existing.socketId : null;
    existing.socketId = socketId;
    existing.lastSeenAt = now;
    return { session: existing, replacedSocketId };
  }

  get(token: string): Session | null {
    return this.byToken.get(token) ?? null;
  }

  /** Detaches a socket from its session; a later socket may still take the session back. */
  release(token: string, socketId: string, now: number): void {
    const session = this.byToken.get(token);
    // A session already taken over by another socket keeps its new owner.
    if (session === undefined || session.socketId !== socketId) {
      return;
    }

    session.socketId = null;
    session.lastSeenAt = now;
  }

  setRoomCode(token: string, roomCode: string | null): void {
    const session = this.byToken.get(token);
    if (session !== undefined) {
      session.roomCode = roomCode;
    }
  }

  /**
   * Clears the room of every session whose seat is gone. The room layer cannot reach the sessions,
   * so a seat lost to the reconnection delay leaves its code behind; a session still pointing at a
   * room never counts as idle, and could never expire.
   */
  forgetRoomsWhere(gone: (roomCode: string, playerId: string) => boolean): void {
    for (const session of this.byToken.values()) {
      if (session.roomCode !== null && gone(session.roomCode, session.playerId)) {
        session.roomCode = null;
      }
    }
  }

  /** Drops sessions bound to no socket and no room for longer than the lifetime. */
  pruneExpired(now: number): void {
    for (const [token, session] of this.byToken) {
      const idle = session.socketId === null && session.roomCode === null;
      if (idle && now - session.lastSeenAt >= this.ttlMs) {
        this.byToken.delete(token);
      }
    }
  }

  get size(): number {
    return this.byToken.size;
  }
}
