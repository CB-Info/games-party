import { describe, expect, it } from "vitest";

import { TAG_DISTANCE } from "../shared/constants";
import { chat, nearby, neverDrawn, rulesWith, runner } from "./cursorTagState.fixture";
import { findContacts } from "./tagContacts";

describe("the order of a tick's contacts", () => {
  it("puts the Runner a Chat meets first before the one it meets next", () => {
    // The Chat runs right, past a Runner 40 ahead and another 60 ahead.
    const players = [
      chat("c", nearby(100), { tickStart: nearby(0) }),
      runner("far", nearby(60 + TAG_DISTANCE)),
      runner("near", nearby(40 + TAG_DISTANCE)),
    ];

    const contacts = findContacts(players, rulesWith({ random: neverDrawn }));

    expect(contacts.map((contact) => contact.runnerId)).toEqual(["near", "far"]);
    expect(contacts[0]?.time).toBeCloseTo(0.4);
  });

  it("puts the Chat who reaches a Runner first before the other one", () => {
    const players = [
      chat("late", nearby(0), { tickStart: nearby(-100) }),
      chat("early", nearby(0), { tickStart: nearby(50) }),
      runner("r", nearby(0)),
    ];

    const contacts = findContacts(players, rulesWith({ random: neverDrawn }));

    expect(contacts.map((contact) => contact.chatId)).toEqual(["early", "late"]);
  });

  it("draws the order of two contacts at exactly the same instant", () => {
    // Two Chats closing on a still Runner from either side, at the same pace.
    const players = [
      chat("left", nearby(0), { tickStart: nearby(-100) }),
      chat("right", nearby(0), { tickStart: nearby(100) }),
      runner("r", nearby(0)),
    ];

    const first = (draw: number) =>
      findContacts(players, rulesWith({ random: () => draw }))[0]?.chatId;

    expect(new Set([first(0), first(0.99)])).toEqual(new Set(["left", "right"]));
  });
});
