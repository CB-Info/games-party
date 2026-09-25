import type { ArenaScene } from "../../../../games/cursor-tag/client/hooks/useArenaScene";

/**
 * Fixed scenes of Cursor Tag's arena for `/dev/ui`, one per state its drawing has
 * (docs/design-system.md, §12). Positions are in arena units, away from the walls.
 */

type Cursor = ArenaScene["cursors"][number];

const PIXEL: Cursor = {
  playerId: "pixel",
  position: { x: 640, y: 300 },
  color: "c2",
  pseudo: "Pixel",
  role: "chat",
  frozenMsLeft: 0,
  isMine: false,
};

const NOVA: Cursor = {
  ...PIXEL,
  playerId: "nova",
  position: { x: 900, y: 250 },
  color: "c5",
  pseudo: "Nova",
  role: "runner",
};

/** A Chat frozen for two more seconds and a bit: its countdown shows 3. */
const ZIPPY: Cursor = {
  ...PIXEL,
  playerId: "zippy",
  position: { x: 1120, y: 560 },
  color: "c9",
  pseudo: "Zippy",
  frozenMsLeft: 2400,
};

const MIKA: Cursor = {
  ...PIXEL,
  playerId: "mika",
  position: { x: 520, y: 620 },
  color: "c1",
  pseudo: "Mika",
  role: "runner",
  isMine: true,
};

/** Biscuit has lost the connection: not drawn, so the scene simply leaves them out (§12). */
const OTHERS = [PIXEL, NOVA, ZIPPY];

/** You run, and have just gone through a portal of pair B, which is on cooldown for you. */
export const AS_RUNNER: ArenaScene = {
  cursors: [...OTHERS, MIKA],
  portalsPulse: true,
  cooldown: ["B"],
};

export const AS_CHAT: ArenaScene = {
  cursors: [...OTHERS, { ...MIKA, role: "chat" }],
  portalsPulse: true,
  cooldown: [],
};

export const AS_FROZEN_CHAT: ArenaScene = {
  cursors: [...OTHERS, { ...MIKA, role: "chat", frozenMsLeft: 900 }],
  portalsPulse: true,
  cooldown: [],
};

/** A spectator has no cursor and no cooldown: every portal pulses. */
export const AS_SPECTATOR: ArenaScene = { cursors: OTHERS, portalsPulse: true, cooldown: [] };

/** Between two rounds: no cursor, and portals without effect, so without pulse. */
export const PREPARATION: ArenaScene = { cursors: [], portalsPulse: false, cooldown: [] };

export const REDUCED_MOTION: ArenaScene = { ...AS_RUNNER, reducedMotion: true };
