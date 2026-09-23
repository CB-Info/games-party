import { connect as connectTcp, createServer, type Socket } from "node:net";
import { io } from "socket.io-client";

import { watch } from "./socketInbox.fixture";
import type { TestClient } from "./socketTestHarness.fixture";

export interface Relay {
  url: string;
  /** Kills the player's side of every connection relayed so far, at once. */
  cut: () => void;
  /** Stops relaying every connection so far, in both directions, and closes nothing. */
  silence: () => void;
  /** Destroys every socket the relay ever opened, then the relay itself. */
  close: () => void;
}

/**
 * A TCP relay between one player and the server, able to fail the way a connection really does.
 * `cut` is the player's own machine dropping the link: the server hears nothing, and keeps the old
 * socket until its heartbeat gives up. `silence` is packets simply lost: nothing passes either
 * way, and nothing is closed. Connections opened after a failure are relayed normally, so that
 * the player can come back.
 */
export function startRelay(target: string): Promise<Relay> {
  const { hostname, port } = new URL(target);
  const relayed: Array<{ near: Socket; far: Socket }> = [];
  // Every socket ever opened, relayed or not any more: a far end left open would hold the server
  // back from closing at the end of a test.
  const opened: Socket[] = [];

  const relay = createServer((near) => {
    const far = connectTcp(Number(port), hostname);
    near.pipe(far);
    far.pipe(near);

    for (const socket of [near, far]) {
      socket.on("error", () => undefined);
      opened.push(socket);
    }
    relayed.push({ near, far });
  });

  function stopRelaying(): Array<{ near: Socket; far: Socket }> {
    const stopped = relayed.splice(0);
    for (const { near, far } of stopped) {
      near.unpipe(far);
      far.unpipe(near);
    }
    return stopped;
  }

  return new Promise((resolve) => {
    relay.listen(0, "127.0.0.1", () => {
      const address = relay.address();
      const relayPort = typeof address === "object" && address !== null ? address.port : 0;

      resolve({
        url: `http://127.0.0.1:${relayPort}`,

        cut: () => {
          for (const { near } of stopRelaying()) {
            near.destroy();
          }
        },

        silence: () => {
          for (const { near, far } of stopRelaying()) {
            near.pause();
            far.pause();
          }
        },

        close: () => {
          for (const socket of opened) {
            socket.destroy();
          }
          relay.close();
        },
      });
    });
  });
}

/** A player behind a relay, who reconnects on their own with their session, as a browser does. */
export function playerBehind(url: string): TestClient {
  let sessionToken: string | null = null;
  const client: TestClient = io(url, {
    forceNew: true,
    transports: ["websocket"],
    reconnectionDelay: 100,
    reconnectionDelayMax: 100,
    randomizationFactor: 0,
    // Read at each connection, as the real client reads its stored token (§4).
    auth: (send) => {
      send(sessionToken === null ? {} : { sessionToken });
    },
  });

  client.on("session:init", (identity) => {
    sessionToken = identity.sessionToken;
  });
  watch(client);

  return client;
}
