import { describe, expect, it } from "vitest";

import {
  VIEW_STATE_CHAT_OR_READY as CHAT_OR_READY,
  VIEW_STATE_CONNECTED as HERE,
} from "../shared/constants";
import { readView } from "./readView";

describe("readView", () => {
  it("reads a round back into its players and the recipient's own counts", () => {
    const view = readView({
      ph: 1,
      r: 2,
      t: 43167,
      p: [
        ["mika", 100, 201, HERE + CHAT_OR_READY, 1733, 5000],
        ["nova", 300.3, 400.8, HERE, 0, 12345],
        ["zippy", 50, 60, 0, 0, 900],
      ],
      m: [41, 33.3, 1967, 0],
    });

    expect(view).toEqual({
      phase: "round",
      round: 2,
      roundTimeLeftMs: 43167,
      players: [
        {
          playerId: "mika",
          x: 100,
          y: 201,
          role: "chat",
          frozenMsLeft: 1733,
          connected: true,
          scoreMs: 5000,
        },
        {
          playerId: "nova",
          x: 300.3,
          y: 400.8,
          role: "runner",
          frozenMsLeft: 0,
          connected: true,
          scoreMs: 12345,
        },
        {
          playerId: "zippy",
          x: 50,
          y: 60,
          role: "runner",
          frozenMsLeft: 0,
          connected: false,
          scoreMs: 900,
        },
      ],
      me: {
        lastProcessedSeq: 41,
        budget: 33.3,
        portalCooldownMs: { A: 1967, B: 0 },
        backlog: { x: 0, y: 0 },
      },
    });
  });

  it("reads the remainder when the view carries one", () => {
    const view = readView({ ph: 1, r: 1, t: 1000, p: [], m: [3, 10, 0, 0, 12.3, -4.5] });

    expect(view.me?.backlog).toEqual({ x: 12.3, y: -4.5 });
  });

  it("gives a spectator no `me`", () => {
    expect(readView({ ph: 1, r: 1, t: 1000, p: [] }).me).toBeNull();
  });

  it("reads the waiting, with who is ready from the state bits", () => {
    const view = readView({
      ph: 0,
      r: 2,
      a: 18333,
      p: [
        ["mika", HERE, 5000],
        ["nova", HERE + CHAT_OR_READY, 0],
        ["zippy", CHAT_OR_READY, 0],
      ],
      m: [7, 0, 0, 0],
    });

    expect(view).toEqual({
      phase: "preparation",
      round: 2,
      preparationStep: "waiting",
      autoStartMsLeft: 18333,
      countdownMsLeft: null,
      readyPlayerIds: ["nova", "zippy"],
      players: [
        { playerId: "mika", connected: true, scoreMs: 5000 },
        { playerId: "nova", connected: true, scoreMs: 0 },
        { playerId: "zippy", connected: false, scoreMs: 0 },
      ],
      me: {
        lastProcessedSeq: 7,
        budget: 0,
        portalCooldownMs: { A: 0, B: 0 },
        backlog: { x: 0, y: 0 },
      },
    });
  });

  it("reads the countdown", () => {
    const view = readView({ ph: 0, r: 1, c: 2967, p: [["mika", HERE, 0]] });

    expect(view).toMatchObject({
      preparationStep: "countdown",
      autoStartMsLeft: null,
      countdownMsLeft: 2967,
      me: null,
    });
  });
});
