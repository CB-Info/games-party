import { describe, expect, it } from "vitest";

import { createIdentityStore } from "./sessionIdentity";

const ALICE = { sessionToken: "token-alice", playerId: "player-alice" };
const BOB = { sessionToken: "token-bob", playerId: "player-bob" };

describe("createIdentityStore", () => {
  it("gives the identity to a subscriber that arrives after it was received", () => {
    const store = createIdentityStore();

    // The faulty order: the server answered while no screen was listening. This is what happens
    // between the home screen creating a room and the lobby mounting.
    store.remember(ALICE);
    store.subscribe(() => undefined);

    expect(store.get()).toEqual(ALICE);
  });

  it("has nothing before the server has answered", () => {
    expect(createIdentityStore().get()).toBeNull();
  });

  it("wakes its subscribers when the identity changes", () => {
    const store = createIdentityStore();
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });
    store.remember(ALICE);
    store.remember(BOB);

    expect(calls).toBe(2);
    expect(store.get()).toEqual(BOB);
  });

  it("keeps the same snapshot when the same identity comes back", () => {
    const store = createIdentityStore();
    let calls = 0;

    store.remember(ALICE);
    const first = store.get();
    store.subscribe(() => {
      calls += 1;
    });
    store.remember({ ...ALICE });

    expect(calls).toBe(0);
    expect(store.get()).toBe(first);
  });

  it("stops calling a subscriber that unsubscribed", () => {
    const store = createIdentityStore();
    let calls = 0;

    const stop = store.subscribe(() => {
      calls += 1;
    });
    stop();
    store.remember(ALICE);

    expect(calls).toBe(0);
  });
});
