import { afterEach, describe, expect, it, vi } from "vitest";

import { SANDBOX_META } from "./sandbox/shared/meta";

const REAL_NODE_ENV = process.env.NODE_ENV;

/** Loads the registry afresh, since it reads the environment when the module is first evaluated. */
async function listGamesWith(nodeEnv: string | undefined) {
  vi.resetModules();
  if (nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = nodeEnv;
  }

  const registry = await import("./registry.server");
  return registry.listGames().map((game) => game.meta.id);
}

afterEach(() => {
  process.env.NODE_ENV = REAL_NODE_ENV;
  vi.resetModules();
});

describe("the server registry", () => {
  it("offers the sandbox while developing", async () => {
    expect(await listGamesWith("development")).toContain(SANDBOX_META.id);
  });

  it("offers nothing at all in production", async () => {
    // The sandbox is a development tool: it must never be playable on the deployed site (§8).
    expect(await listGamesWith("production")).toEqual([]);
  });

  it("finds a game by the id of its shared meta", async () => {
    vi.resetModules();
    process.env.NODE_ENV = "development";
    const registry = await import("./registry.server");

    expect(registry.findGame(SANDBOX_META.id)?.meta.name).toBe(SANDBOX_META.name);
    expect(registry.findGame("nothing-like-that")).toBeNull();
  });
});
