import type { ServerToClientEvents } from "../../shared/protocol";
import type { GameViewPayload, RoomState } from "../../shared/types";
import type { TestClient } from "./socketTestHarness.fixture";

type SessionInit = Parameters<ServerToClientEvents["session:init"]>[0];

/** Milliseconds a test waits for a message before failing with a useful error. */
export const ACK_TIMEOUT_MS = 2000;

/**
 * Everything a client received, kept from the moment it connects. Without this buffer a test that
 * subscribes after sending its request would miss the answer that arrived first.
 */
interface Inbox {
  sessions: SessionInit[];
  states: RoomState[];
  views: GameViewPayload[];
  replaced: boolean;
  listeners: Array<() => void>;
}

const inboxes = new WeakMap<TestClient, Inbox>();

/** Records everything the server sends, from the moment the client is created. */
export function watch(client: TestClient): void {
  const inbox: Inbox = { sessions: [], states: [], views: [], replaced: false, listeners: [] };
  inboxes.set(client, inbox);

  const notify = (): void => {
    for (const listener of inbox.listeners) {
      listener();
    }
  };

  client.on("session:init", (payload) => {
    inbox.sessions.push(payload);
    notify();
  });
  client.on("room:state", (state) => {
    inbox.states.push(state);
    notify();
  });
  client.on("game:view", (payload) => {
    inbox.views.push(payload);
    notify();
  });
  client.on("session:replaced", () => {
    inbox.replaced = true;
    notify();
  });
}

/**
 * Resolves as soon as `read` returns a value, looking at what already arrived before waiting for
 * more. Fails fast rather than hanging.
 */
function awaitInbox<Value>(
  client: TestClient,
  read: (inbox: Inbox) => Value | undefined,
  what: string,
): Promise<Value> {
  const inbox = inboxes.get(client);
  if (inbox === undefined) {
    return Promise.reject(new Error("This client is not watched"));
  }

  return new Promise((resolve, reject) => {
    const settle = (): boolean => {
      const value = read(inbox);
      if (value === undefined) {
        return false;
      }

      clearTimeout(timer);
      inbox.listeners = inbox.listeners.filter((listener) => listener !== settle);
      resolve(value);
      return true;
    };

    const timer = setTimeout(() => {
      inbox.listeners = inbox.listeners.filter((listener) => listener !== settle);
      reject(new Error(`No matching ${what} received`));
    }, ACK_TIMEOUT_MS);

    if (!settle()) {
      inbox.listeners.push(settle);
    }
  });
}

/** The session this client was given (docs/architecture.md, §4). */
export function sessionOf(client: TestClient): Promise<SessionInit> {
  return awaitInbox(client, (inbox) => inbox.sessions.at(0), "session:init");
}

/** The first room state that satisfies `predicate`, past ones included (§6.2). */
export function waitForState(
  client: TestClient,
  predicate: (state: RoomState) => boolean = () => true,
): Promise<RoomState> {
  return awaitInbox(client, (inbox) => inbox.states.findLast(predicate), "room:state");
}

/** The first game view this client received (§6.3). */
export function waitForView(client: TestClient): Promise<GameViewPayload> {
  return awaitInbox(client, (inbox) => inbox.views.at(0), "game:view");
}

/** Resolves once this client was told its session was opened elsewhere (§4). */
export function waitForReplaced(client: TestClient): Promise<true> {
  return awaitInbox(client, (inbox) => (inbox.replaced ? true : undefined), "session:replaced");
}
