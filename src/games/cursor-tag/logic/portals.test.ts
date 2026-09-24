import { describe, expect, it } from "vitest";

import { budgetCap } from "../../../shared/cursor/moveCursor";
import { PORTAL_COOLDOWN_MS, PORTAL_RADIUS } from "../shared/constants";
import { PORTAL_PAIRS } from "../shared/map";
import { CATCH_UP_TEST_MS, chat, runner } from "./cursorTagState.fixture";
import { maxSpeedOf } from "./movement";
import { findPortalEntry, moveAndTeleport } from "./portals";

const READY = { A: 0, B: 0 };

/** The two pairs, as the map places them (rules.md, §6.5). */
const A = { first: { x: 120, y: 120 }, second: { x: 1480, y: 780 } };
const B = { first: { x: 1480, y: 120 }, second: { x: 120, y: 780 } };

/** A point `gap` to the right of a portal's centre. */
function rightOf(portal: { x: number; y: number }, gap: number) {
  return { x: portal.x + gap, y: portal.y };
}

describe("findPortalEntry", () => {
  it("reads the portals of the map", () => {
    expect(PORTAL_PAIRS).toEqual([
      { pair: "A", ...A },
      { pair: "B", ...B },
    ]);
  });

  it("fires on a move from outside the circle to inside it, towards the other portal", () => {
    const entry = findPortalEntry(rightOf(A.first, PORTAL_RADIUS), rightOf(A.first, 10), READY);

    expect(entry).toEqual({ pair: "A", exit: A.second });
  });

  it("fires both ways", () => {
    const entry = findPortalEntry(rightOf(A.second, -50), rightOf(A.second, -20), READY);

    expect(entry).toEqual({ pair: "A", exit: A.first });
  });

  it("fires on a fast move that goes straight through and out the other side", () => {
    const entry = findPortalEntry(rightOf(A.first, 50), rightOf(A.first, -50), READY);

    expect(entry?.pair).toBe("A");
  });

  it("does not fire on a move that only grazes the circle", () => {
    const along = { x: A.first.x + 60, y: A.first.y + PORTAL_RADIUS };

    expect(findPortalEntry(along, { x: A.first.x - 60, y: along.y }, READY)).toBeNull();
    expect(
      findPortalEntry(rightOf(A.first, 80), rightOf(A.first, PORTAL_RADIUS), READY),
    ).toBeNull();
  });

  it("does nothing while the pair is cooling down for this player, and leaves the other pair be", () => {
    const cooling = { A: 1, B: 0 };

    expect(findPortalEntry(rightOf(A.first, 50), A.first, cooling)).toBeNull();
    expect(findPortalEntry(rightOf(B.first, -50), B.first, cooling)).toEqual({
      pair: "B",
      exit: B.second,
    });
  });

  it("does not fire for a player who arrived on the centre and moves about inside", () => {
    expect(findPortalEntry(A.second, rightOf(A.second, 20), READY)).toBeNull();
  });

  it("fires again once the player has left the circle and comes back in", () => {
    const left = rightOf(A.second, PORTAL_RADIUS + 5);

    expect(findPortalEntry(A.second, left, READY)).toBeNull();
    expect(findPortalEntry(left, A.second, READY)?.pair).toBe("A");
  });
});

describe("moveAndTeleport", () => {
  const nearA = rightOf(A.first, PORTAL_RADIUS + 10);
  const intoA = { x: -30, y: 0 };

  it("lands the player on the other portal, which starts their path for the tick", () => {
    const player = runner("r", nearA, { budget: budgetCap(maxSpeedOf("runner")) });

    const { player: carried, events } = moveAndTeleport(player, intoA, 0);

    expect(carried.position).toEqual(A.second);
    expect(carried.tickStart).toEqual(A.second);
    expect(carried.portalCooldownMs).toEqual({ A: PORTAL_COOLDOWN_MS, B: 0 });
    expect(events).toEqual([{ type: "portal", playerId: "r", pair: "A" }]);
  });

  it("drops the remainder of the catch-up", () => {
    const player = chat("c", nearA, { budget: 30, backlog: { x: -40, y: 0 } });

    const { player: carried } = moveAndTeleport(player, intoA, CATCH_UP_TEST_MS);

    expect(carried.position).toEqual(A.second);
    expect(carried.backlog).toEqual({ x: 0, y: 0 });
  });

  it("leaves a move that enters no portal as it was", () => {
    const player = runner("r", nearA, { budget: 20 });

    const { player: moved, events } = moveAndTeleport(player, { x: 20, y: 0 }, 0);

    expect(moved.position.x).toBeCloseTo(nearA.x + 20);
    expect(moved.tickStart).toEqual(nearA);
    expect(events).toEqual([]);
  });
});
