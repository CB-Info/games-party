import { describe, expect, it } from "vitest";

import { settingsFor } from "./cursorTagOptions";
import { findPlayer } from "./cursorTagState";
import { OPEN_GROUND, SETTINGS, chat, runner } from "./cursorTagState.fixture";
import { resolveTags } from "./tagResolution";

const HERE = { x: OPEN_GROUND.x + 20, y: OPEN_GROUND.y };

/** A Chat with budget in hand and a remainder owed, tagging a Runner who has both too. */
const PLAYERS = [
  chat("c", OPEN_GROUND, { budget: 40, backlog: { x: 12, y: 0 } }),
  runner("r", HERE, { tickStart: OPEN_GROUND, budget: 30, backlog: { x: 5, y: 5 } }),
];

function tagged(freezeMs = SETTINGS.freezeMs) {
  return resolveTags(PLAYERS, [{ chatId: "c", runnerId: "r", time: 0.5 }], freezeMs);
}

describe("the effect of a tag", () => {
  it("makes the tagged Runner a Chat, frozen where they stand, with nothing in hand or owed", () => {
    const player = findPlayer(tagged().players, "r");

    expect(player).toMatchObject({
      role: "chat",
      frozenMsLeft: SETTINGS.freezeMs,
      position: HERE,
      budget: 0,
      backlog: { x: 0, y: 0 },
    });
  });

  it("freezes the tagged Runner for the freeze length the host set", () => {
    const settings = settingsFor({
      chatCount: 1,
      roundCount: 3,
      roundDurationS: 60,
      freezeDurationS: 5,
    });

    expect(findPlayer(tagged(settings.freezeMs).players, "r")?.frozenMsLeft).toBe(
      settings.freezeMs,
    );
  });

  it("makes the Chat who tagged a Runner with no freeze, who keeps their budget and remainder", () => {
    const player = findPlayer(tagged().players, "c");

    expect(player).toMatchObject({
      role: "runner",
      frozenMsLeft: 0,
      budget: 40,
      backlog: { x: 12, y: 0 },
    });
  });

  it("tells the room who tagged whom", () => {
    expect(tagged().events).toEqual([{ type: "tag", chatId: "c", taggedId: "r" }]);
  });
});
