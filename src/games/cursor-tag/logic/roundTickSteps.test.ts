import { describe, expect, it } from "vitest";

import { budgetCap } from "../../../shared/cursor/moveCursor";
import { PORTAL_RADIUS } from "../shared/constants";
import { findPlayer } from "./cursorTagState";
import {
  CATCHING_UP,
  OPEN_GROUND,
  chat,
  roundOf,
  rulesWith,
  runner,
} from "./cursorTagState.fixture";
import { maxSpeedOf } from "./movement";
import { countDownTimers, payBacklogs, rechargeBudgets, scoreRunners } from "./roundTickSteps";

const OWED = { x: 30, y: 0 };

describe("countDownTimers", () => {
  it("runs down the round's time, the freezes and the portal cooldowns", () => {
    const round = roundOf(
      [chat("c", OPEN_GROUND, { frozenMsLeft: 500, portalCooldownMs: { A: 100, B: 900 } })],
      {
        timeLeftMs: 1000,
      },
    );

    const counted = countDownTimers(round, 300);

    expect(counted.timeLeftMs).toBe(700);
    expect(counted.players[0]).toMatchObject({
      frozenMsLeft: 200,
      portalCooldownMs: { A: 0, B: 600 },
    });
  });

  it("never runs a timer below zero", () => {
    const round = roundOf([chat("c", OPEN_GROUND, { frozenMsLeft: 10 })], { timeLeftMs: 10 });

    const counted = countDownTimers(round, 33);

    expect(counted.timeLeftMs).toBe(0);
    expect(counted.players[0]?.frozenMsLeft).toBe(0);
  });
});

describe("payBacklogs", () => {
  it("pays what a player owes from what is left of their budget", () => {
    const players = [runner("r", OPEN_GROUND, { budget: 20, backlog: OWED })];

    const [paid] = payBacklogs(players, rulesWith({ settings: CATCHING_UP })).players;

    expect(paid?.position.x).toBeCloseTo(OPEN_GROUND.x + 20);
    expect(paid?.budget).toBeCloseTo(0);
    expect(paid?.backlog.x).toBeCloseTo(10);
  });

  it("leaves a frozen player and a player who is away owing what they owe", () => {
    const players = [
      chat("frozen", OPEN_GROUND, { budget: 20, backlog: OWED, frozenMsLeft: 1 }),
      runner("away", OPEN_GROUND, { budget: 20, backlog: OWED }),
    ];

    const paid = payBacklogs(players, rulesWith({ settings: CATCHING_UP, away: ["away"] }));

    expect(paid.players).toEqual(players);
  });

  it("sends a player through a portal their remainder enters", () => {
    const nearA = { x: 120 + PORTAL_RADIUS + 10, y: 120 };
    const players = [runner("r", nearA, { budget: 30, backlog: { x: -30, y: 0 } })];

    const paid = payBacklogs(players, rulesWith({ settings: CATCHING_UP }));

    expect(paid.events).toEqual([{ type: "portal", playerId: "r", pair: "A" }]);
    expect(findPlayer(paid.players, "r")?.position).toEqual({ x: 1480, y: 780 });
  });
});

describe("scoreRunners", () => {
  it("gives the elapsed time to every connected Runner, and nothing to Chats or to Runners away", () => {
    const players = [chat("c"), runner("here"), runner("away", OPEN_GROUND, { scoreMs: 500 })];

    const scored = scoreRunners(players, 33, (id) => id !== "away");

    expect(scored.map((player) => player.scoreMs)).toEqual([0, 33, 500]);
  });
});

describe("rechargeBudgets", () => {
  it("recharges every player who is not frozen, at the speed of their role", () => {
    const players = [chat("c"), runner("r"), chat("frozen", OPEN_GROUND, { frozenMsLeft: 1 })];

    const recharged = rechargeBudgets(players, 1000);

    expect(recharged.map((player) => player.budget)).toEqual([
      budgetCap(maxSpeedOf("chat")),
      budgetCap(maxSpeedOf("runner")),
      0,
    ]);
  });
});
