import type { ArenaScene as Scene } from "../hooks/useArenaScene";
import { ArenaScene } from "./ArenaScene";

type Cursor = Scene["cursors"][number];

const PIXEL: Cursor = {
  playerId: "pixel",
  position: { x: 560, y: 300 },
  color: "c2",
  pseudo: "Pixel",
  role: "chat",
  frozenMsLeft: 0,
  isMine: false,
};

/**
 * The lobby's still picture of the arena, with its fictional players — Pixel as the Chat, Nova,
 * Biscuit and Zippy, never the players of the room (docs/design-system.md, §13). Drawn by the
 * game's own renderer, so that the lobby shows the Chat the game will show.
 */
const DEMO: Scene = {
  cursors: [
    PIXEL,
    {
      ...PIXEL,
      playerId: "nova",
      position: { x: 1040, y: 240 },
      color: "c5",
      pseudo: "Nova",
      role: "runner",
    },
    {
      ...PIXEL,
      playerId: "biscuit",
      position: { x: 480, y: 650 },
      color: "c7",
      pseudo: "Biscuit",
      role: "runner",
    },
    {
      ...PIXEL,
      playerId: "zippy",
      position: { x: 1180, y: 560 },
      color: "c9",
      pseudo: "Zippy",
      role: "runner",
    },
  ],
  portalsPulse: false,
  cooldown: [],
  still: true,
};

export function CursorTagPreview() {
  return <ArenaScene scene={DEMO} label="Aperçu de l’arène de Cursor Tag" />;
}
