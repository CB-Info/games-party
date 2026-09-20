import { describe, expect, it } from "vitest";

import { SESSION_PLAYER_ID_LENGTH, SESSION_TOKEN_LENGTH } from "../../shared/constants";
import { SessionStore } from "./SessionStore";

const NOW = 1_000_000;
const TTL_MS = 10_000;

describe("SessionStore", () => {
  it("opens a new session when no token is given", () => {
    const store = new SessionStore();

    const { session, replacedSocketId } = store.open(undefined, "socket-1", NOW);

    expect(session.token).toHaveLength(SESSION_TOKEN_LENGTH);
    expect(session.playerId).toHaveLength(SESSION_PLAYER_ID_LENGTH);
    expect(session.socketId).toBe("socket-1");
    expect(replacedSocketId).toBeNull();
  });

  it("opens a new session when the token is unknown", () => {
    const store = new SessionStore();

    const { session } = store.open("a-token-nobody-ever-issued", "socket-1", NOW);

    expect(session.token).not.toBe("a-token-nobody-ever-issued");
    expect(store.size).toBe(1);
  });

  it("gives the same identity back to a known token", () => {
    const store = new SessionStore();
    const first = store.open(undefined, "socket-1", NOW);

    const second = store.open(first.session.token, "socket-2", NOW + 1);

    expect(second.session.playerId).toBe(first.session.playerId);
    expect(store.size).toBe(1);
  });

  it("reports the socket to disconnect when a session is opened elsewhere", () => {
    const store = new SessionStore();
    const first = store.open(undefined, "socket-1", NOW);

    const second = store.open(first.session.token, "socket-2", NOW + 1);

    expect(second.replacedSocketId).toBe("socket-1");
    expect(second.session.socketId).toBe("socket-2");
  });

  it("reports no replacement when the same socket opens its session again", () => {
    const store = new SessionStore();
    const first = store.open(undefined, "socket-1", NOW);

    const again = store.open(first.session.token, "socket-1", NOW + 1);

    expect(again.replacedSocketId).toBeNull();
  });

  it("keeps the new owner when the replaced socket is released", () => {
    const store = new SessionStore();
    const { session } = store.open(undefined, "socket-1", NOW);
    store.open(session.token, "socket-2", NOW + 1);

    store.release(session.token, "socket-1", NOW + 2);

    expect(store.get(session.token)?.socketId).toBe("socket-2");
  });

  it("drops a session left without socket nor room for longer than its lifetime", () => {
    const store = new SessionStore({ ttlMs: TTL_MS });
    const { session } = store.open(undefined, "socket-1", NOW);
    store.release(session.token, "socket-1", NOW);

    store.pruneExpired(NOW + TTL_MS);

    expect(store.get(session.token)).toBeNull();
  });

  it("keeps a session that still sits in a room", () => {
    const store = new SessionStore({ ttlMs: TTL_MS });
    const { session } = store.open(undefined, "socket-1", NOW);
    store.release(session.token, "socket-1", NOW);
    store.setRoomCode(session.token, "abcdefghij");

    store.pruneExpired(NOW + TTL_MS);

    expect(store.get(session.token)).not.toBeNull();
  });

  it("keeps a session still held by a socket", () => {
    const store = new SessionStore({ ttlMs: TTL_MS });
    const { session } = store.open(undefined, "socket-1", NOW);

    store.pruneExpired(NOW + TTL_MS);

    expect(store.get(session.token)).not.toBeNull();
  });
});
