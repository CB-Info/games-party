import { describe, expect, it } from "vitest";

import { NO_SEQ_PROCESSED } from "../../../shared/cursor/cursorInput";
import { disconnectPlayer, reconnectPlayer } from "./connections";
import { findPlayer, type RoundState } from "./cursorTagState";
import {
  CATCHING_UP,
  SETTINGS,
  TICK_MS,
  asRound,
  chat,
  nearby,
  roundOf,
  rulesWith,
  runner,
} from "./cursorTagState.fixture";
import { playRoundTick } from "./roundTick";

const TWO_CHATS = { ...SETTINGS, chatCount: 2 };

function tickWith(state: RoundState, away: string[]) {
  return playRoundTick(state, TICK_MS, rulesWith({ away }));
}

describe("disconnectPlayer during a round", () => {
  it("leaves a Runner where they are, out of reach and no longer scoring", () => {
    const round = roundOf([chat("c", nearby(0)), runner("r", nearby(20), { scoreMs: 900 })]);

    const { state, events } = disconnectPlayer(round, "r", rulesWith({ away: ["r"] }));
    const ticked = tickWith(asRound(state), ["r"]);

    expect(events).toEqual([]);
    expect(ticked.events).toEqual([]);
    expect(findPlayer(asRound(ticked.state).players, "r")).toMatchObject({
      role: "runner",
      position: nearby(20),
      scoreMs: 900,
    });
  });

  it("replaces a Chat by the rule of §11, and the replacement can tag from the next tick", () => {
    const round = roundOf([
      chat("a", nearby(-150)),
      chat("b", nearby(150)),
      runner("c", nearby(0)),
      runner("d", nearby(20)),
      runner("e", nearby(100, 100)),
    ]);
    const rules = rulesWith({ settings: TWO_CHATS, away: ["a"], random: () => 0 });

    const replaced = disconnectPlayer(round, "a", rules);
    const ticked = tickWith(asRound(replaced.state), ["a"]);

    expect(replaced.events).toEqual([
      { type: "chatReplaced", previousChatId: "a", newChatId: "c" },
    ]);
    expect(ticked.events).toEqual([{ type: "tag", chatId: "c", taggedId: "d" }]);
  });

  it("keeps a Chat who is not replaced a Chat: unable to tag while away, tagging again on return", () => {
    // 3 players, 1 Chat, and S already away: replacing C would take R, the last connected Runner.
    const round = roundOf([
      chat("c", nearby(0)),
      runner("r", nearby(20)),
      runner("s", nearby(200)),
    ]);

    const left = disconnectPlayer(round, "c", rulesWith({ away: ["c", "s"] }));
    const whileAway = tickWith(asRound(left.state), ["c", "s"]);
    const back = reconnectPlayer(whileAway.state, "c");
    const onReturn = tickWith(asRound(back), ["s"]);

    expect(left.events).toEqual([]);
    expect(findPlayer(asRound(left.state).players, "c")?.role).toBe("chat");
    expect(whileAway.events).toEqual([]);
    expect(onReturn.events).toEqual([{ type: "tag", chatId: "c", taggedId: "r" }]);
  });

  it("replaces only the Chat who leaves, not one who left earlier (§11, fourth example)", () => {
    const players = [
      chat("a", nearby(-150)),
      chat("b", nearby(150)),
      runner("c", nearby(-50, 100)),
      runner("d", nearby(50, 100)),
      runner("e", nearby(0, -100)),
    ];
    const rules = (away: string[]) => rulesWith({ settings: TWO_CHATS, away, random: () => 0 });

    // D and E lose their connection, then A: 1 Chat left, for a cap of 1. A is not replaced.
    const noOne = disconnectPlayer(roundOf(players), "a", rules(["a", "d", "e"]));
    // D and E come back, then B leaves: no Chat left, for a cap of 2, and a single replacement.
    const back = reconnectPlayer(reconnectPlayer(noOne.state, "d"), "e");
    const one = disconnectPlayer(back, "b", rules(["a", "b"]));
    const roles = asRound(one.state).players.map((player) => `${player.playerId}:${player.role}`);

    expect(noOne.events).toEqual([]);
    expect(one.events).toEqual([{ type: "chatReplaced", previousChatId: "b", newChatId: "c" }]);
    expect(roles).toEqual(["a:chat", "b:runner", "c:chat", "d:runner", "e:runner"]);
  });
  it("replaces nobody when a Runner leaves, even with a Chat away unreplaced", () => {
    // A left while too few were connected; everyone else is back, then the Runner D leaves.
    const round = roundOf([
      chat("a", nearby(-150)),
      chat("b", nearby(150)),
      runner("c", nearby(-50, 100)),
      runner("d", nearby(50, 100)),
      runner("e", nearby(0, -100)),
    ]);

    const left = disconnectPlayer(round, "d", rulesWith({ settings: TWO_CHATS, away: ["a", "d"] }));

    expect(left).toEqual({ state: round, events: [] });
  });
});

describe("reconnectPlayer during a round", () => {
  it("restarts the input count, with nothing in hand or owed, and keeps position, role and score", () => {
    const round = roundOf([
      chat("c", nearby(0), {
        lastProcessedSeq: 80,
        budget: 40,
        backlog: { x: 9, y: 0 },
        scoreMs: 3000,
      }),
      runner("r", nearby(200)),
    ]);

    const back = asRound(reconnectPlayer(round, "c"));

    expect(findPlayer(back.players, "c")).toMatchObject({
      lastProcessedSeq: NO_SEQ_PROCESSED,
      budget: 0,
      backlog: { x: 0, y: 0 },
      position: nearby(0),
      role: "chat",
      scoreMs: 3000,
    });
  });

  it("leaves a returning player nothing to pay in the tick that follows", () => {
    const round = roundOf([
      chat("c", nearby(-200)),
      runner("r", nearby(0), { budget: 40, backlog: { x: 30, y: 0 } }),
    ]);

    const back = asRound(reconnectPlayer(round, "r"));
    const ticked = playRoundTick(back, TICK_MS, rulesWith({ settings: CATCHING_UP }));

    expect(findPlayer(asRound(ticked.state).players, "r")?.position).toEqual(nearby(0));
  });
});
