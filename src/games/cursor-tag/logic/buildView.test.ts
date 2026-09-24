import { describe, expect, it } from "vitest";

import {
  VIEW_OWN_PRECISION,
  VIEW_STATE_CHAT_OR_READY as CHAT_OR_READY,
  VIEW_STATE_CONNECTED as HERE,
} from "../shared/constants";
import { buildView } from "./buildView";
import { chat, countdownOf, member, roundOf, runner, waitingOf } from "./cursorTagState.fixture";

const EVERYONE_HERE = (): boolean => true;
const NOBODY_HERE = (): boolean => false;

/** A value as the recipient's own counts keep it (rules.md, §8.2). */
function own(value: number): number {
  return Math.round(value * VIEW_OWN_PRECISION) / VIEW_OWN_PRECISION;
}

describe("buildView during a round", () => {
  const round = roundOf(
    [
      chat("mika", { x: 100.46, y: 200.54 }, { frozenMsLeft: 1733.4, scoreMs: 4999.6 }),
      runner("nova", { x: 300.25, y: 400.75 }, { scoreMs: 12345.4 }),
    ],
    { round: 2, timeLeftMs: 43166.6 },
  );

  it("sends every player as an array of values, and the recipient's own counts in `m`", () => {
    const withCounts = roundOf(
      round.players.map((player) =>
        player.playerId === "nova"
          ? {
              ...player,
              lastProcessedSeq: 41,
              budget: 33.333,
              portalCooldownMs: { A: 1966.7, B: 0 },
            }
          : player,
      ),
      { round: 2, timeLeftMs: 43166.6 },
    );

    expect(buildView(withCounts, { playerId: "nova" }, EVERYONE_HERE)).toEqual({
      ph: 1,
      r: 2,
      t: 43167,
      p: [
        ["mika", 100, 201, HERE + CHAT_OR_READY, 1733, 5000],
        ["nova", own(300.25), own(400.75), HERE, 0, 12345],
      ],
      m: [41, own(33.333), 1967, 0],
    });
  });

  it("rounds the others to the unit and the recipient to their own precision", () => {
    // The recipient's prediction starts from their own position, which must not end up inside a
    // wall corner the real one clears (rules.md, §8.2); the others are only interpolated.
    const forMika = buildView(round, { playerId: "mika" }, EVERYONE_HERE);

    expect(forMika.p[0]?.slice(1, 3)).toEqual([own(100.46), own(200.54)]);
    expect(forMika.p[1]?.slice(1, 3)).toEqual([300, 401]);
  });

  it("carries the remainder only when there is one left once rounded", () => {
    const owing = roundOf([runner("nova", undefined, { backlog: { x: 12.34, y: -4.56 } })]);
    const underHalfAStep = 0.4 / VIEW_OWN_PRECISION;
    const barely = roundOf([
      runner("nova", undefined, { backlog: { x: underHalfAStep, y: -underHalfAStep } }),
    ]);

    expect(buildView(owing, { playerId: "nova" }, EVERYONE_HERE).m?.slice(4)).toEqual([
      own(12.34),
      own(-4.56),
    ]);
    expect(buildView(barely, { playerId: "nova" }, EVERYONE_HERE).m).toHaveLength(4);
  });

  it("marks a player who is away, whatever their role", () => {
    const forSpectator = buildView(round, { spectator: true }, NOBODY_HERE);

    expect(forSpectator.p.map((player) => player[3])).toEqual([CHAT_OR_READY, 0]);
  });

  it("gives no `m` to a spectator, nor to anyone the game does not know", () => {
    expect(buildView(round, { spectator: true }, EVERYONE_HERE)).not.toHaveProperty("m");
    expect(buildView(round, { playerId: "zippy" }, EVERYONE_HERE)).not.toHaveProperty("m");
  });
});

describe("buildView during a preparation", () => {
  const players = [member("mika", { scoreMs: 4999.6, lastProcessedSeq: 7 }), member("nova")];

  it("sends the waiting with its delay, and who is ready in the state bits", () => {
    const waiting = waitingOf(players, ["nova"], {
      round: 2,
      step: { kind: "waiting", autoStartMsLeft: 18333.4 },
    });

    expect(buildView(waiting, { playerId: "mika" }, EVERYONE_HERE)).toEqual({
      ph: 0,
      r: 2,
      a: 18333,
      p: [
        ["mika", HERE, 5000],
        ["nova", HERE + CHAT_OR_READY, 0],
      ],
      m: [7, 0, 0, 0],
    });
  });

  it("sends the countdown with its time left instead of the delay", () => {
    const view = buildView(countdownOf(players, 2966.7), { spectator: true }, NOBODY_HERE);

    expect(view).toEqual({
      ph: 0,
      r: 1,
      c: 2967,
      p: [
        ["mika", 0, 5000],
        ["nova", 0, 0],
      ],
    });
  });
});
