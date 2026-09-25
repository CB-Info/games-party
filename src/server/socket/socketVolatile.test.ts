import { afterEach, describe, expect, it } from "vitest";

import {
  ACK_TIMEOUT_MS,
  connected,
  startTestServer,
  type TestClient,
  type TestServer,
} from "./socketTestHarness.fixture";

/**
 * What the library does with a volatile message sent right behind another one, on which a rule of
 * docs/architecture.md (§6.2) rests: never a volatile message in the same pass as a reliable one.
 * Should an upgrade change it, these tests say so.
 */

const INPUT = { seq: 0, dx: 1, dy: 0 };

let server: TestServer | null = null;

afterEach(async () => {
  await server?.stop();
  server = null;
});

/** A server that notes every input it receives, room or not, and a client connected to it. */
async function listening(): Promise<{ client: TestClient; inputs: unknown[] }> {
  server = await startTestServer();
  const inputs: unknown[] = [];
  server.socketServer.io.on("connection", (socket) => {
    socket.on("game:input", (payload) => inputs.push(payload));
  });

  return { client: await connected(server), inputs };
}

/**
 * A request the server answers. Messages on one connection arrive in order, so once it is answered
 * everything sent before it has arrived — or never left.
 */
function answered(client: TestClient): Promise<unknown> {
  return client.timeout(ACK_TIMEOUT_MS).emitWithAck("room:preview", { code: "nowhere" });
}

describe("a volatile message on a real connection", () => {
  it("is dropped when it follows a reliable message in the same pass", async () => {
    const { client, inputs } = await listening();

    const reliable = answered(client);
    client.volatile.emit("game:input", INPUT);
    await reliable;
    await answered(client);

    expect(inputs).toEqual([]);
  });

  it("arrives when it waits for the next task", async () => {
    const { client, inputs } = await listening();

    const reliable = answered(client);
    await new Promise((resolve) => setTimeout(resolve, 0));
    client.volatile.emit("game:input", INPUT);
    await reliable;
    await answered(client);

    expect(inputs).toEqual([INPUT]);
  });

  it("keeps only the first of several sent in one pass", async () => {
    // What the latency simulator did when a hole closed, before it let one message go per task.
    const { client, inputs } = await listening();

    for (let seq = 0; seq < 5; seq += 1) {
      client.volatile.emit("game:input", { ...INPUT, seq });
    }
    await answered(client);

    expect(inputs).toEqual([INPUT]);
  });
});
