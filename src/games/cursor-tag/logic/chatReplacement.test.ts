import { describe, expect, it } from "vitest";

import { replaceDepartedChat } from "./chatReplacement";
import { findPlayer, type RoundPlayer } from "./cursorTagState";
import {
  SETTINGS,
  chat,
  nearby,
  neverDrawn,
  roundOf,
  rulesWith,
  runner,
} from "./cursorTagState.fixture";

/** Chats and Runners standing apart, as many as a test needs. */
function lineUp(chatIds: string[], runnerIds: string[]): RoundPlayer[] {
  return [
    ...chatIds.map((id, index) => chat(id, nearby(-150 + index * 40, -80))),
    ...runnerIds.map((id, index) => runner(id, nearby(-150 + index * 40, 80))),
  ];
}

function rolesOf(players: readonly RoundPlayer[]): Record<string, string> {
  return Object.fromEntries(players.map((player) => [player.playerId, player.role]));
}

describe("replaceDepartedChat", () => {
  it("does not replace a Chat when a single connected Runner is left (§11, first example)", () => {
    // 4 players, 3 Chats; A leaves: B and C go on chasing D.
    const round = roundOf(lineUp(["a", "b", "c"], ["d"]));
    const rules = rulesWith({
      settings: { ...SETTINGS, chatCount: 3 },
      away: ["a"],
      random: neverDrawn,
    });

    expect(replaceDepartedChat(round, "a", rules)).toEqual({ state: round, events: [] });
  });

  it("replaces a Chat by a connected Runner drawn at random (§11, second example)", () => {
    // 5 players, 2 Chats; A leaves: three connected Runners, one of them drawn.
    const round = roundOf(lineUp(["a", "b"], ["c", "d", "e"]));
    const rules = rulesWith({
      settings: { ...SETTINGS, chatCount: 2 },
      away: ["a"],
      random: () => 0.5,
    });

    const { state, events } = replaceDepartedChat(round, "a", rules);

    expect(events).toEqual([{ type: "chatReplaced", previousChatId: "a", newChatId: "d" }]);
    expect(rolesOf(state.players)).toEqual({
      a: "runner",
      b: "chat",
      c: "runner",
      d: "chat",
      e: "runner",
    });
  });

  it("keeps the Chats the round started with, one replacement for one departure (§11, third example)", () => {
    // 6 players, 3 Chats set, but the round started with 2 while few were connected. Everyone is
    // back when A leaves: four connected Runners, and a single replacement.
    const round = roundOf(lineUp(["a", "b"], ["c", "d", "e", "f"]));
    const rules = rulesWith({
      settings: { ...SETTINGS, chatCount: 3 },
      away: ["a"],
      random: () => 0,
    });

    const { state, events } = replaceDepartedChat(round, "a", rules);

    expect(events).toHaveLength(1);
    expect(state.players.filter((player) => player.role === "chat")).toHaveLength(2);
  });

  it("never takes the last connected Runner", () => {
    // A leaves while B is away: C, the only connected player, is left running.
    const round = roundOf(lineUp(["a"], ["b", "c"]));
    const rules = rulesWith({ away: ["a", "b"], random: neverDrawn });

    expect(replaceDepartedChat(round, "a", rules)).toEqual({ state: round, events: [] });
  });

  it("draws the replacement among the connected Runners only", () => {
    const round = roundOf(lineUp(["a", "b"], ["c", "d", "e"]));
    const settings = { ...SETTINGS, chatCount: 2 };

    for (const draw of [0, 0.5, 0.99]) {
      const rules = rulesWith({ settings, away: ["a", "d"], random: () => draw });
      const { events } = replaceDepartedChat(round, "a", rules);

      expect(events).toHaveLength(1);
      expect(events).not.toContainEqual(expect.objectContaining({ newChatId: "d" }));
    }
  });

  it("gives the replacement no freeze and leaves them what they owe", () => {
    const players = [
      chat("a"),
      chat("b", nearby(-100)),
      runner("c", nearby(100), { budget: 25, backlog: { x: 4, y: 0 } }),
      runner("d", nearby(150)),
    ];
    const rules = rulesWith({
      settings: { ...SETTINGS, chatCount: 2 },
      away: ["a"],
      random: () => 0,
    });

    const replacement = findPlayer(
      replaceDepartedChat(roundOf(players), "a", rules).state.players,
      "c",
    );

    expect(replacement).toMatchObject({
      role: "chat",
      frozenMsLeft: 0,
      budget: 25,
      backlog: { x: 4, y: 0 },
    });
  });

  it("makes a frozen Chat who is away and replaced a Runner with no freeze", () => {
    const players = [
      chat("a", nearby(0), { frozenMsLeft: 2000 }),
      runner("b", nearby(100)),
      runner("c", nearby(150)),
    ];
    const rules = rulesWith({ away: ["a"], random: () => 0 });

    const departed = findPlayer(
      replaceDepartedChat(roundOf(players), "a", rules).state.players,
      "a",
    );

    expect(departed).toMatchObject({ role: "runner", frozenMsLeft: 0 });
  });
});
