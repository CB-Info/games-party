import { describe, expect, it } from "vitest";

import { buildView } from "../../logic/buildView";
import type { PreparationState, RoundState } from "../../logic/cursorTagState";
import { chat, member, roundOf, runner, waitingOf } from "../../logic/cursorTagState.fixture";
import { readView } from "../../logic/readView";
import { mineAt, othersAt, portalsIn, type PlayerNames, type TimedView } from "./tagDrawables";

const NAMES: PlayerNames = {
  colorOf: new Map([
    ["mika", "c1"],
    ["nova", "c5"],
  ]),
  pseudoOf: new Map([
    ["mika", "Mika"],
    ["nova", "Nova"],
  ]),
};

function seen(
  state: PreparationState | RoundState,
  serverTime: number,
  away: readonly string[] = [],
): TimedView {
  const view = readView(buildView(state, { playerId: "mika" }, (id) => !away.includes(id)));
  return { view, serverTime };
}

/** Nova runs, is tagged between the two views, and freezes as a Chat. */
const BEFORE = seen(roundOf([runner("mika"), runner("nova", { x: 400, y: 300 })]), 1000);
const AFTER = seen(
  roundOf([runner("mika"), chat("nova", { x: 430, y: 300 }, { frozenMsLeft: 3000 })]),
  1033,
);

describe("othersAt", () => {
  it("slides a player between the two views, and keeps the earlier view's role", () => {
    const [nova] = othersAt({ from: BEFORE, to: AFTER, t: 0.5 }, 1016, "mika", NAMES);

    expect(nova).toMatchObject({ position: { x: 415, y: 300 }, role: "runner", frozenMsLeft: 0 });
  });

  it("changes the role at the view where the server made the change", () => {
    const [nova] = othersAt({ from: AFTER, to: null, t: 0 }, 1033, "mika", NAMES);

    expect(nova).toMatchObject({ position: { x: 430, y: 300 }, role: "chat", frozenMsLeft: 3000 });
  });

  it("runs a freeze's countdown on from the view that carried it", () => {
    const [nova] = othersAt({ from: AFTER, to: null, t: 0 }, 1533, "mika", NAMES);

    expect(nova?.frozenMsLeft).toBe(2500);
  });

  it("leaves out the local player, and a player who is away", () => {
    const withAway = seen(roundOf([runner("mika"), runner("nova")]), 1000, ["nova"]);

    expect(
      othersAt({ from: BEFORE, to: null, t: 0 }, 1000, "mika", NAMES).map((c) => c.playerId),
    ).toEqual(["nova"]);
    expect(othersAt({ from: withAway, to: null, t: 0 }, 1000, "mika", NAMES)).toEqual([]);
  });

  it("draws nobody between two rounds", () => {
    const waiting = seen(waitingOf([member("mika"), member("nova")]), 1000);

    expect(othersAt({ from: waiting, to: BEFORE, t: 0.5 }, 1016, "mika", NAMES)).toEqual([]);
  });
});

describe("mineAt", () => {
  it("draws the local player where the prediction puts them, with the last view's role", () => {
    expect(mineAt(AFTER.view, "mika", { x: 810, y: 250 }, NAMES)).toEqual({
      playerId: "mika",
      position: { x: 810, y: 250 },
      color: "c1",
      pseudo: "Mika",
      role: "runner",
      frozenMsLeft: 0,
      isMine: true,
    });
  });

  it("takes their own role and freeze from the last view, as they are, not aged", () => {
    // Nova's delayed view still shows Mika running; the last one has just made Mika the Chat.
    const tagged = seen(
      roundOf([chat("mika", undefined, { frozenMsLeft: 2900 }), runner("nova")]),
      1066,
    );

    expect(mineAt(tagged.view, "mika", { x: 810, y: 250 }, NAMES)).toMatchObject({
      role: "chat",
      frozenMsLeft: 2900,
      isMine: true,
    });
  });

  it("draws no cursor for them between two rounds", () => {
    const waiting = seen(waitingOf([member("mika")]), 1000);

    expect(mineAt(waiting.view, "mika", { x: 0, y: 0 }, NAMES)).toBeNull();
  });
});

describe("portalsIn", () => {
  it("dims the pairs on cooldown for the local player, and lets the others pulse", () => {
    const cooling = seen(
      roundOf([runner("mika", undefined, { portalCooldownMs: { A: 0, B: 1200 } })]),
      0,
    );

    expect(portalsIn(cooling.view)).toEqual({ pulsing: true, cooldown: new Set(["B"]) });
  });

  it("lets nothing pulse between two rounds", () => {
    expect(portalsIn(seen(waitingOf([member("mika")]), 0).view).pulsing).toBe(false);
  });

  it("shows a spectator no cooldown", () => {
    const view = readView(buildView(roundOf([runner("nova")]), { spectator: true }, () => true));

    expect(portalsIn(view)).toEqual({ pulsing: true, cooldown: new Set() });
  });
});
