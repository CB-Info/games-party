import { describe, expect, it } from "vitest";

import { SETTINGS, chat, runner } from "./cursorTagState.fixture";
import type { Contact } from "./tagContacts";
import { resolveTags } from "./tagResolution";

/** Contacts in the order the tick found them; their instants no longer matter here. */
function inOrder(...pairs: Array<[string, string]>): Contact[] {
  return pairs.map(([chatId, runnerId], index) => ({ chatId, runnerId, time: index / 10 }));
}

function tags(players: Parameters<typeof resolveTags>[0], contacts: Contact[]): string[] {
  return resolveTags(players, contacts, SETTINGS.freezeMs).events.map(
    (event) => `${event.chatId}>${event.taggedId}`,
  );
}

describe("resolveTags", () => {
  it("tags only the first of two Runners a Chat meets in the tick", () => {
    const players = [chat("c"), runner("near"), runner("far")];

    expect(tags(players, inOrder(["c", "near"], ["c", "far"]))).toEqual(["c>near"]);
  });

  it("gives a Runner reached by two Chats to the first one, once", () => {
    const players = [chat("early"), chat("late"), runner("r")];

    expect(tags(players, inOrder(["early", "r"], ["late", "r"]))).toEqual(["early>r"]);
  });

  it("skips only the contacts of players whose role has changed", () => {
    // c1 tags r1, so c1 cannot go on to tag r2; c2 still can.
    const players = [chat("c1"), chat("c2"), runner("r1"), runner("r2")];

    expect(tags(players, inOrder(["c1", "r1"], ["c1", "r2"], ["c2", "r2"]))).toEqual([
      "c1>r1",
      "c2>r2",
    ]);
  });

  it("changes nothing without a contact", () => {
    const players = [chat("c"), runner("r")];

    expect(resolveTags(players, [], SETTINGS.freezeMs)).toEqual({ players, events: [] });
  });
});
