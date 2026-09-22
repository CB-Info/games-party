import { describe, expect, it } from "vitest";

import type { RoomState } from "../../shared/types";
import { createRoomStateStore } from "./roomState";

function roomOf(code: string): RoomState {
  return {
    code,
    status: "lobby",
    hostId: "player-mika",
    players: [],
    selectedGameId: null,
    selectedGameOptions: null,
    readyPlayerIds: [],
    cumulative: [],
    lastResults: null,
  };
}

describe("createRoomStateStore", () => {
  it("gives the room to a screen that mounts after it arrived", () => {
    const store = createRoomStateStore();

    // The faulty order: room:create answers with room:state before its acknowledgement, so the
    // room reaches a browser still showing the home screen, with no lobby to listen for it.
    store.remember(roomOf("abcdefghij"));
    store.subscribe(() => undefined);

    expect(store.get()?.code).toBe("abcdefghij");
  });

  it("knows nothing before the server has said anything", () => {
    expect(createRoomStateStore().get()).toBeNull();
  });

  it("wakes its subscribers on every broadcast", () => {
    const store = createRoomStateStore();
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });
    store.remember(roomOf("abcdefghij"));
    store.remember(roomOf("abcdefghij"));

    expect(calls).toBe(2);
  });

  it("empties itself and says so", () => {
    const store = createRoomStateStore();
    let calls = 0;

    store.remember(roomOf("abcdefghij"));
    store.subscribe(() => {
      calls += 1;
    });
    store.forget();

    expect(store.get()).toBeNull();
    expect(calls).toBe(1);
  });

  it("says nothing when it is emptied twice", () => {
    const store = createRoomStateStore();
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });
    store.forget();

    expect(calls).toBe(0);
  });

  it("stops calling a subscriber that unsubscribed", () => {
    const store = createRoomStateStore();
    let calls = 0;

    const stop = store.subscribe(() => {
      calls += 1;
    });
    stop();
    store.remember(roomOf("abcdefghij"));

    expect(calls).toBe(0);
  });
});
