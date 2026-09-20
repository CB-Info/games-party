import { afterEach, describe, expect, it } from "vitest";

import {
  ask,
  connected,
  ACK_TIMEOUT_MS,
  startTestServer,
  type TestServer,
} from "./socketTestHarness.fixture";

/** Small budgets, so that a test reaches the limits without sending hundreds of messages. */
const MESSAGES_PER_SECOND = 5;
const JOIN_FAILURES_PER_MINUTE = 3;
const KICK_AFTER_MS = 150;

let server: TestServer | null = null;

afterEach(async () => {
  await server?.stop();
  server = null;
});

/** The running server, with a clear message when a test forgot to start one. */
function mustServer(): TestServer {
  if (server === null) {
    throw new Error("The server is not started");
  }

  return server;
}

describe("the message rate limit (§9)", () => {
  it("refuses a message over budget that expects an answer", async () => {
    server = await startTestServer({
      rateLimits: { messagesPerSecond: MESSAGES_PER_SECOND, kickAfterMs: ACK_TIMEOUT_MS * 10 },
    });
    const client = await connected(mustServer());

    const answers = [];
    for (let i = 0; i < MESSAGES_PER_SECOND + 2; i += 1) {
      answers.push(await ask(client).emitWithAck("room:preview", { code: "aaaaaaaaaa" }));
    }

    expect(answers.at(-1)).toEqual({ ok: false, error: "RATE_LIMITED" });
  });

  it("drops a message over budget that expects nothing, in silence", async () => {
    server = await startTestServer({
      rateLimits: { messagesPerSecond: MESSAGES_PER_SECOND, kickAfterMs: ACK_TIMEOUT_MS * 10 },
    });
    const client = await connected(mustServer());
    const created = await ask(client).emitWithAck("room:create", {
      pseudo: "Mika",
      preferredColor: "c1",
    });
    expect(created.ok).toBe(true);

    for (let i = 0; i < MESSAGES_PER_SECOND * 2; i += 1) {
      client.emit("game:input", { delta: 1 });
    }
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(client.connected).toBe(true);
  });

  it("disconnects a socket that stays over the budget", async () => {
    server = await startTestServer({
      rateLimits: { messagesPerSecond: MESSAGES_PER_SECOND, kickAfterMs: KICK_AFTER_MS },
    });
    const client = await connected(mustServer());

    const gone = new Promise<void>((resolve) => client.on("disconnect", () => resolve()));
    const flood = setInterval(() => client.emit("game:input", { delta: 1 }), 5);
    await gone;
    clearInterval(flood);

    expect(client.connected).toBe(false);
  });
});

describe("the unknown-room limit (§9)", () => {
  it("rate limits a socket that keeps asking for rooms that do not exist", async () => {
    server = await startTestServer({
      rateLimits: { joinFailuresPerMinute: JOIN_FAILURES_PER_MINUTE },
    });
    const client = await connected(mustServer());

    const answers = [];
    for (let i = 0; i < JOIN_FAILURES_PER_MINUTE + 1; i += 1) {
      answers.push(await ask(client).emitWithAck("room:preview", { code: "zzzzzzzzzz" }));
    }

    expect(answers.at(0)).toEqual({ ok: false, error: "ROOM_NOT_FOUND" });
    expect(answers.at(-1)).toEqual({ ok: false, error: "RATE_LIMITED" });
  });

  it("does not count a pseudo already taken", async () => {
    server = await startTestServer({
      rateLimits: { joinFailuresPerMinute: JOIN_FAILURES_PER_MINUTE },
    });
    const host = await connected(mustServer());
    const created = await ask(host).emitWithAck("room:create", {
      pseudo: "Mika",
      preferredColor: "c1",
    });
    const code = created.ok ? created.data.code : "";
    const guest = await connected(mustServer());

    const answers = [];
    for (let i = 0; i < JOIN_FAILURES_PER_MINUTE + 2; i += 1) {
      answers.push(
        await ask(guest).emitWithAck("room:join", { code, pseudo: "Mika", preferredColor: "c2" }),
      );
    }

    expect(answers.every((answer) => !answer.ok && answer.error === "PSEUDO_TAKEN")).toBe(true);
  });

  it("does not count a full room", async () => {
    server = await startTestServer({
      rateLimits: { joinFailuresPerMinute: JOIN_FAILURES_PER_MINUTE },
    });
    const host = await connected(mustServer());
    const created = await ask(host).emitWithAck("room:create", {
      pseudo: "Mika",
      preferredColor: "c1",
    });
    const code = created.ok ? created.data.code : "";

    // Fill the room up to its capacity, then keep knocking at the door.
    for (let i = 1; i < 10; i += 1) {
      const filler = await connected(mustServer());
      await ask(filler).emitWithAck("room:join", {
        code,
        pseudo: `Joueur${i}`,
        preferredColor: "c2",
      });
    }
    const late = await connected(mustServer());

    const answers = [];
    for (let i = 0; i < JOIN_FAILURES_PER_MINUTE + 2; i += 1) {
      answers.push(
        await ask(late).emitWithAck("room:join", { code, pseudo: "Tardif", preferredColor: "c3" }),
      );
    }

    expect(answers.every((answer) => !answer.ok && answer.error === "ROOM_FULL")).toBe(true);
  });
});
