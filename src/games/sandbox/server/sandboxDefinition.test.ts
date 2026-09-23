import { describe, expect, it } from "vitest";

import {
  SANDBOX_CATCH_UP_MS_MAX,
  SANDBOX_CATCH_UP_MS_MIN,
  SANDBOX_DURATION_S_MAX,
  SANDBOX_DURATION_S_MIN,
  SANDBOX_SPEED_MAX,
  SANDBOX_SPEED_MIN,
} from "../shared/constants";
import { sandboxOptionsSchema, type SandboxOptions } from "../shared/schemas";
import { sandboxGame } from "./sandboxDefinition";

/** The sandbox's bounds do not depend on the number of players: any count will do. */
const PLAYER_COUNT = 4;

/** Options on a step and inside the bounds, of which each test changes one value. */
const VALID: SandboxOptions = { durationS: 60, maxSpeed: 2000, catchUpMs: 200 };

/**
 * What the room keeps of options the host sends: the game's schema first, then its normalisation,
 * as `RoomGameSelection` does. `null` when the schema turns them down, which the host hears as
 * INVALID_PAYLOAD while the options stay as they were.
 */
function received(options: unknown): SandboxOptions | null {
  const parsed = sandboxGame.parseOptions(options);

  return parsed.ok
    ? sandboxOptionsSchema.parse(sandboxGame.normalizeOptions(parsed.value, PLAYER_COUNT))
    : null;
}

describe("the sandbox's options, as the host sends them", () => {
  it("keeps options that are on a step and inside the bounds as they are", () => {
    expect(received(VALID)).toEqual(VALID);
  });

  it("brings a value below its lower bound up to it", () => {
    expect(received({ ...VALID, durationS: 10 })?.durationS).toBe(SANDBOX_DURATION_S_MIN);
    expect(received({ ...VALID, maxSpeed: 200 })?.maxSpeed).toBe(SANDBOX_SPEED_MIN);
    expect(received({ ...VALID, catchUpMs: -100 })?.catchUpMs).toBe(SANDBOX_CATCH_UP_MS_MIN);
  });

  it("brings a value above its upper bound down to it", () => {
    expect(received({ ...VALID, durationS: 1000 })?.durationS).toBe(SANDBOX_DURATION_S_MAX);
    expect(received({ ...VALID, maxSpeed: 20_000 })?.maxSpeed).toBe(SANDBOX_SPEED_MAX);
    expect(received({ ...VALID, catchUpMs: 900 })?.catchUpMs).toBe(SANDBOX_CATCH_UP_MS_MAX);
  });

  it("brings a value off its step to the nearest one", () => {
    // Steps of 15 s from 30 s, 1000 u/s from 1000 and 100 ms from 0 (rules.md, §3). 70 s is the
    // example of Cursor Tag's own rules, which the sandbox follows.
    expect(received({ ...VALID, durationS: 70 })?.durationS).toBe(75);
    expect(received({ ...VALID, durationS: 50 })?.durationS).toBe(45);
    expect(received({ ...VALID, maxSpeed: 2400 })?.maxSpeed).toBe(2000);
    expect(received({ ...VALID, maxSpeed: 2600 })?.maxSpeed).toBe(3000);
    expect(received({ ...VALID, catchUpMs: 140 })?.catchUpMs).toBe(100);
    expect(received({ ...VALID, catchUpMs: 260 })?.catchUpMs).toBe(300);
  });

  it("turns down options with a value missing, rather than making one up", () => {
    // Each option on its own. A key left out and a key sent as null are the two ways a value can
    // be absent once the message has crossed the network.
    expect(received({ maxSpeed: 2000, catchUpMs: 200 })).toBeNull();
    expect(received({ durationS: 60, catchUpMs: 200 })).toBeNull();
    expect(received({ durationS: 60, maxSpeed: 2000 })).toBeNull();
    expect(received({ ...VALID, maxSpeed: null })).toBeNull();
  });
});
