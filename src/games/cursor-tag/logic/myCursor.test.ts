import { describe, expect, it } from "vitest";

import { buildView } from "./buildView";
import { chat, member, roundOf, runner, waitingOf } from "./cursorTagState.fixture";
import { maxSpeedOf } from "./movement";
import { myCursorIn } from "./myCursor";
import { readView } from "./readView";
import type { PreparationState, RoundState } from "./cursorTagState";

const HERE = (): boolean => true;

/** What Mika's browser reads of a state, through the view the server would send it. */
function seenByMika(state: PreparationState | RoundState) {
  return myCursorIn(readView(buildView(state, { playerId: "mika" }, HERE)), "mika");
}

describe("myCursorIn", () => {
  it("gives a Runner the Runner's speed, from where the view puts them", () => {
    const seen = seenByMika(
      roundOf([runner("mika", { x: 400, y: 300 }, { budget: 20, lastProcessedSeq: 8 })]),
    );

    expect(seen).toEqual({
      lastProcessedSeq: 8,
      cursor: {
        position: { x: 400, y: 300 },
        budget: 20,
        backlog: { x: 0, y: 0 },
        maxSpeed: maxSpeedOf("runner"),
        frozen: false,
        role: "runner",
      },
    });
  });

  it("gives a Chat the Chat's speed", () => {
    expect(seenByMika(roundOf([chat("mika")])).cursor?.maxSpeed).toBe(maxSpeedOf("chat"));
  });

  it("says a frozen Chat is held still", () => {
    expect(
      seenByMika(roundOf([chat("mika", undefined, { frozenMsLeft: 1500 })])).cursor?.frozen,
    ).toBe(true);
  });

  it("carries the remainder the view carries, for the prediction to go on paying it", () => {
    // Always nil while the game's leash is zero (rules.md, §15.3), but carried all the same.
    const owing = roundOf([runner("mika", undefined, { backlog: { x: 12.3, y: -4.5 } })]);

    expect(seenByMika(owing).cursor?.backlog).toEqual({ x: 12.3, y: -4.5 });
  });

  it("gives only the input count between two rounds, where there is no cursor", () => {
    expect(seenByMika(waitingOf([member("mika", { lastProcessedSeq: 5 })]))).toEqual({
      lastProcessedSeq: 5,
      cursor: null,
    });
  });

  it("gives a spectator nothing at all", () => {
    const view = readView(buildView(roundOf([runner("nova")]), { spectator: true }, HERE));

    expect(myCursorIn(view, "mika")).toEqual({ lastProcessedSeq: null, cursor: null });
  });
});
