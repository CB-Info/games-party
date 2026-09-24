import { describe, expect, it } from "vitest";

import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import { MAX_PLAYERS } from "../shared/constants";
import { SPAWN_POINTS } from "../shared/map";
import { settingsFor } from "./cursorTagOptions";
import { SETTINGS, member, rulesWith, waitingOf } from "./cursorTagState.fixture";
import { startRound } from "./roundStart";

/** Five players between rounds, with the scores and input counts of the round before. */
const PREPARATION = waitingOf(
  ["a", "b", "c", "d", "e"].map((id, index) =>
    member(id, { scoreMs: index * 1000, lastProcessedSeq: 10 + index }),
  ),
  [],
  { round: 2 },
);

/** Any steady draw will do where a test does not look at who is drawn. */
const STEADY = () => 0.3;

describe("startRound", () => {
  it("has a spawn point for every seat of a game", () => {
    expect(SPAWN_POINTS.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
  });

  it("draws as many Chats as the host set, and makes the others Runners", () => {
    const rules = rulesWith({ settings: { ...SETTINGS, chatCount: 2 }, random: STEADY });

    const { state } = startRound(PREPARATION, rules);

    expect(state.players.filter((player) => player.role === "chat")).toHaveLength(2);
    expect(state.players.filter((player) => player.role === "runner")).toHaveLength(3);
  });

  it("draws fewer Chats when few players are connected, among them, and remembers how many", () => {
    // Three Chats set, but two players connected: one Chat, so that one of them runs.
    const rules = rulesWith({
      settings: { ...SETTINGS, chatCount: 3 },
      away: ["a", "b", "c"],
      random: STEADY,
    });

    const { state } = startRound(PREPARATION, rules);
    const chatIds = state.players
      .filter((player) => player.role === "chat")
      .map((player) => player.playerId);

    expect(chatIds).toHaveLength(1);
    expect(["d", "e"]).toContain(chatIds[0]);
  });

  it("freezes the Chats for the freeze length the host set, and leaves the Runners free", () => {
    const settings = settingsFor({
      chatCount: 2,
      roundCount: 3,
      roundDurationS: 60,
      freezeDurationS: 5,
    });

    const { state } = startRound(PREPARATION, rulesWith({ settings, random: STEADY }));

    for (const player of state.players) {
      expect(player.frozenMsLeft).toBe(player.role === "chat" ? settings.freezeMs : 0);
    }
  });

  it("lasts the round length the host set", () => {
    const settings = settingsFor({
      chatCount: 1,
      roundCount: 3,
      roundDurationS: 45,
      freezeDurationS: 3,
    });

    const { state } = startRound(PREPARATION, rulesWith({ settings, random: STEADY }));

    expect(state.timeLeftMs).toBe(settings.roundMs);
    expect(state.round).toBe(PREPARATION.round);
  });

  it("starts everyone on their own spawn point, with nothing in hand and nothing owed", () => {
    const { state } = startRound(PREPARATION, rulesWith({ random: STEADY }));
    const spots = state.players.map((player) => `${player.position.x},${player.position.y}`);

    expect(new Set(spots).size).toBe(state.players.length);
    for (const player of state.players) {
      expect(SPAWN_POINTS).toContainEqual(player.position);
      expect(player.tickStart).toEqual(player.position);
      expect(player.budget).toBe(0);
      expect(player.backlog).toEqual({ x: 0, y: 0 });
      expect(player.portalCooldownMs).toEqual({ A: 0, B: 0 });
      expect(player).toMatchObject({ pastPaths: [], pathBroken: false });
    }
  });

  it("keeps each player's score and input count", () => {
    const { state } = startRound(PREPARATION, rulesWith({ random: STEADY }));

    expect(
      state.players.map(({ playerId, scoreMs, lastProcessedSeq }) => ({
        playerId,
        scoreMs,
        lastProcessedSeq,
      })),
    ).toEqual(PREPARATION.players);
    expect(state.players.every((player) => player.lastProcessedSeq !== NO_SEQ_PROCESSED)).toBe(
      true,
    );
  });

  it("shuffles the spawn points with the game's randomness", () => {
    const first = startRound(PREPARATION, rulesWith({ random: () => 0 })).state;
    const other = startRound(PREPARATION, rulesWith({ random: () => 0.99 })).state;
    const again = startRound(PREPARATION, rulesWith({ random: () => 0 })).state;

    expect(other.players[0]?.position).not.toEqual(first.players[0]?.position);
    expect(again.players).toEqual(first.players);
  });

  it("tells the room which round starts, and who the Chats are", () => {
    const { state, events } = startRound(PREPARATION, rulesWith({ random: STEADY }));
    const chatIds = state.players
      .filter((player) => player.role === "chat")
      .map((player) => player.playerId);

    expect(events).toEqual([{ type: "roundStart", round: PREPARATION.round, chatIds }]);
  });
});
