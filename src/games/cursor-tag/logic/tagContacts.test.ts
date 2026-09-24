import { describe, expect, it } from "vitest";

import type { Point } from "../../../shared/cursor/collision";
import { TAG_DISTANCE } from "../shared/constants";
import type { RoundPlayer } from "./cursorTagState";
import { OPEN_GROUND, chat, rulesWith, runner } from "./cursorTagState.fixture";
import { findContacts } from "./tagContacts";

/** A point `dx` to the right of and `dy` below the open ground. */
function at(dx: number, dy = 0): Point {
  return { x: OPEN_GROUND.x + dx, y: OPEN_GROUND.y + dy };
}

/** Pairs found, without their instants. */
function pairs(players: RoundPlayer[], away: string[] = []): string[] {
  return findContacts(players, rulesWith({ away })).map(
    (contact) => `${contact.chatId}>${contact.runnerId}`,
  );
}

describe("findContacts", () => {
  it("finds a Chat and a Runner standing exactly TAG_DISTANCE apart, and not one unit further", () => {
    expect(pairs([chat("c", at(0)), runner("r", at(TAG_DISTANCE))])).toEqual(["c>r"]);
    expect(pairs([chat("c", at(0)), runner("r", at(TAG_DISTANCE + 1))])).toEqual([]);
  });

  it("finds a head-on crossing that overlaps between two ticks", () => {
    // Out of reach at the start and at the end of the tick: only the sweep sees them meet.
    const crossing = [
      chat("c", at(60), { tickStart: at(-60) }),
      runner("r", at(-60), { tickStart: at(60) }),
    ];

    expect(pairs(crossing)).toEqual(["c>r"]);
  });

  it("does not find a crossing one unit wider than the reach", () => {
    const wide = TAG_DISTANCE + 1;
    const crossing = [
      chat("c", at(60), { tickStart: at(-60) }),
      runner("r", at(-60, wide), { tickStart: at(60, wide) }),
    ];

    expect(pairs(crossing)).toEqual([]);
  });

  it("does not find two paths that cross at different moments of the tick", () => {
    // The Chat reaches the crossing halfway through the tick, the Runner a tenth of the way in.
    const crossing = [
      chat("c", at(100), { tickStart: at(0) }),
      runner("r", at(50, 5 * TAG_DISTANCE), { tickStart: at(50, -TAG_DISTANCE) }),
    ];

    expect(pairs(crossing)).toEqual([]);
  });

  it("leaves a frozen Chat unable to tag", () => {
    expect(pairs([chat("c", at(0), { frozenMsLeft: 1 }), runner("r", at(10))])).toEqual([]);
  });

  it("leaves a Chat who is away unable to tag, and a Runner who is away out of reach", () => {
    const close = [chat("c", at(0)), runner("r", at(10))];

    expect(pairs(close, ["c"])).toEqual([]);
    expect(pairs(close, ["r"])).toEqual([]);
  });

  it("never pairs two Chats or two Runners", () => {
    expect(pairs([chat("a", at(0)), chat("b", at(5)), runner("r", at(200))])).toEqual([]);
    expect(pairs([chat("c", at(200)), runner("a", at(0)), runner("b", at(5))])).toEqual([]);
  });
});
