import { describe, expect, it } from "vitest";

import { moveCursor, budgetCap } from "../../../shared/cursor/moveCursor";
import { CHAT_SPEED_MULTIPLIER, CURSOR_RADIUS, RUNNER_MAX_SPEED } from "../shared/constants";
import { WALLS } from "../shared/map";
import { CATCH_UP_TEST_MS, OPEN_GROUND, chat, runner } from "./cursorTagState.fixture";
import { maxSpeedOf, moveAtRoleSpeed, rechargeAtRoleSpeed } from "./movement";

/** A move far longer than any reserve, so that only the budget decides how far a player goes. */
const LONG_MOVE = { x: 150, y: 0 };

/** The leash of a role at the tests' catch-up length, in logical units. */
function leashOf(role: "chat" | "runner"): number {
  return (maxSpeedOf(role) * CATCH_UP_TEST_MS) / 1000;
}

describe("maxSpeedOf", () => {
  it("gives a Chat the Runner's speed times the multiplier", () => {
    expect(maxSpeedOf("runner")).toBe(RUNNER_MAX_SPEED);
    expect(maxSpeedOf("chat")).toBe(RUNNER_MAX_SPEED * CHAT_SPEED_MULTIPLIER);
  });
});

describe("moveAtRoleSpeed", () => {
  it("takes a Chat further than a Runner, each on a full reserve of their role", () => {
    const asChat = chat("c", OPEN_GROUND, { budget: budgetCap(maxSpeedOf("chat")) });
    const asRunner = runner("r", OPEN_GROUND, { budget: budgetCap(maxSpeedOf("runner")) });

    const chatMoved = moveAtRoleSpeed(asChat, LONG_MOVE, 0).position.x - OPEN_GROUND.x;
    const runnerMoved = moveAtRoleSpeed(asRunner, LONG_MOVE, 0).position.x - OPEN_GROUND.x;

    expect(chatMoved).toBeCloseTo(budgetCap(maxSpeedOf("chat")));
    expect(runnerMoved).toBeCloseTo(budgetCap(maxSpeedOf("runner")));
    expect(chatMoved).toBeGreaterThan(runnerMoved);
  });

  it("is exactly `moveCursor` without catch-up: what the budget refuses is lost", () => {
    const player = runner("r", OPEN_GROUND, { budget: 40 });
    const expected = moveCursor({
      position: OPEN_GROUND,
      delta: LONG_MOVE,
      budget: 40,
      maxSpeed: RUNNER_MAX_SPEED,
      radius: CURSOR_RADIUS,
      walls: WALLS,
    });

    const moved = moveAtRoleSpeed(player, LONG_MOVE, 0);

    expect(moved.position).toEqual(expected.position);
    expect(moved.budget).toBe(expected.budget);
    expect(moved.backlog).toEqual({ x: 0, y: 0 });
  });

  it("keeps what the budget refuses as a remainder with catch-up on", () => {
    const moved = moveAtRoleSpeed(
      runner("r", OPEN_GROUND, { budget: 40 }),
      { x: 100, y: 0 },
      CATCH_UP_TEST_MS,
    );

    expect(moved.position.x).toBeCloseTo(OPEN_GROUND.x + 40);
    expect(moved.backlog.x).toBeCloseTo(60);
  });

  it("stops at Cursor Tag's walls", () => {
    // Just left of the central pillar, pushing right into it.
    const pillar = { x: 740, y: 390, width: 120, height: 120 };
    const beside = { x: pillar.x - CURSOR_RADIUS - 5, y: pillar.y + pillar.height / 2 };

    const moved = moveAtRoleSpeed(runner("r", beside, { budget: 60 }), { x: 60, y: 0 }, 0);

    expect(WALLS).toContainEqual(pillar);
    expect(moved.position.x).toBeLessThanOrEqual(pillar.x - CURSOR_RADIUS);
  });

  it("cuts a Chat's remainder back to the Runner's leash once the role has changed", () => {
    // A remainder as long as a Chat's leash, held by a player who has just tagged: their next
    // move, here the payment of the remainder with nothing in hand, keeps a Runner's leash of it.
    const held = { x: leashOf("chat"), y: 0 };
    const turnedRunner = runner("r", OPEN_GROUND, { backlog: held });

    const moved = moveAtRoleSpeed(turnedRunner, { x: 0, y: 0 }, CATCH_UP_TEST_MS);

    expect(leashOf("chat")).toBeGreaterThan(leashOf("runner"));
    expect(moved.backlog.x).toBeCloseTo(leashOf("runner"));
    expect(moved.position).toEqual(OPEN_GROUND);
  });
});

describe("rechargeAtRoleSpeed", () => {
  it("refills up to the reserve of the player's role", () => {
    const longPause = 1000;

    expect(rechargeAtRoleSpeed(chat("c"), longPause).budget).toBeCloseTo(
      budgetCap(maxSpeedOf("chat")),
    );
    expect(rechargeAtRoleSpeed(runner("r"), longPause).budget).toBeCloseTo(
      budgetCap(maxSpeedOf("runner")),
    );
  });

  it("brings a former Chat's fuller reserve down to a Runner's", () => {
    const formerChat = runner("r", OPEN_GROUND, { budget: budgetCap(maxSpeedOf("chat")) });

    expect(rechargeAtRoleSpeed(formerChat, 1).budget).toBeCloseTo(budgetCap(maxSpeedOf("runner")));
  });
});
