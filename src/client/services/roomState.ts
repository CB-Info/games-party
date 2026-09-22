import type { RoomState } from "../../shared/types";

export interface RoomStateStore {
  /** Keeps the room the server just broadcast, and wakes every subscriber. */
  remember: (state: RoomState) => void;
  /** Forgets it: this browser no longer knows whether it holds a seat anywhere. */
  forget: () => void;
  get: () => RoomState | null;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Holds the last room the server sent, so that a screen mounting afterwards still has it. Creating
 * a room is the case that needs it: `room:create` answers with `room:state` first and the
 * acknowledgement second, so the room arrives while the home screen is still showing and the lobby
 * does not exist yet. Nothing would ever send it again on that connection.
 */
export function createRoomStateStore(): RoomStateStore {
  let current: RoomState | null = null;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    // Every broadcast is a new object, so it always replaces the previous one: that is what makes
    // `get` usable as a snapshot.
    remember: (state) => {
      current = state;
      notify();
    },

    forget: () => {
      if (current === null) {
        return;
      }

      current = null;
      notify();
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

/** The room this browser sits in, as the server last described it (docs/architecture.md, §6.2). */
export const roomState = createRoomStateStore();
