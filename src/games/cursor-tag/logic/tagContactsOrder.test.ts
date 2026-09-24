import { describe, expect, it } from "vitest";

import type { Point } from "../../../shared/cursor/collision";
import { TAG_DISTANCE } from "../shared/constants";
import { OPEN_GROUND, chat, neverDrawn, rulesWith, runner } from "./cursorTagState.fixture";
import { findContacts } from "./tagContacts";

function at(dx: number, dy = 0): Point {
  return { x: OPEN_GROUND.x + dx, y: OPEN_GROUND.y + dy };
}

describe("the order of a tick's contacts", () => {
  it("puts the Runner a Chat meets first before the one it meets next", () => {
    // The Chat runs right, past a Runner 40 ahead and another 60 ahead.
    const players = [
      chat("c", at(100), { tickStart: at(0) }),
      runner("far", at(60 + TAG_DISTANCE)),
      runner("near", at(40 + TAG_DISTANCE)),
    ];

    const contacts = findContacts(players, rulesWith({ random: neverDrawn }));

    expect(contacts.map((contact) => contact.runnerId)).toEqual(["near", "far"]);
    expect(contacts[0]?.time).toBeCloseTo(0.4);
  });

  it("puts the Chat who reaches a Runner first before the other one", () => {
    const players = [
      chat("late", at(0), { tickStart: at(-100) }),
      chat("early", at(0), { tickStart: at(50) }),
      runner("r", at(0)),
    ];

    const contacts = findContacts(players, rulesWith({ random: neverDrawn }));

    expect(contacts.map((contact) => contact.chatId)).toEqual(["early", "late"]);
  });

  it("draws the order of two contacts at exactly the same instant", () => {
    // Two Chats closing on a still Runner from either side, at the same pace.
    const players = [
      chat("left", at(0), { tickStart: at(-100) }),
      chat("right", at(0), { tickStart: at(100) }),
      runner("r", at(0)),
    ];

    const first = (draw: number) =>
      findContacts(players, rulesWith({ random: () => draw }))[0]?.chatId;

    expect(new Set([first(0), first(0.99)])).toEqual(new Set(["left", "right"]));
  });
});
