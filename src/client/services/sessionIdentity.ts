export interface SessionIdentity {
  sessionToken: string;
  playerId: string;
}

export interface IdentityStore {
  /** Keeps the identity the server just sent, and wakes every subscriber. */
  remember: (identity: SessionIdentity) => void;
  get: () => SessionIdentity | null;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Holds the last identity received, so that a subscriber arriving after `session:init` still gets
 * it. The server only sends it once per connection: a screen mounted later — the lobby, right after
 * the home screen created the room — would otherwise never learn who it is.
 */
export function createIdentityStore(): IdentityStore {
  let current: SessionIdentity | null = null;
  const listeners = new Set<() => void>();

  return {
    remember: (identity) => {
      if (
        current?.playerId === identity.playerId &&
        current.sessionToken === identity.sessionToken
      ) {
        // Same identity: keeping the object untouched is what lets `get` be read as a snapshot.
        return;
      }

      current = identity;
      for (const listener of listeners) {
        listener();
      }
    },

    get: () => current,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** This browser's identity for the current connection (docs/architecture.md, §4). */
export const sessionIdentity = createIdentityStore();
