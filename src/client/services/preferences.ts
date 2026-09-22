import { PLAYER_COLOR_IDS } from "../../shared/constants";
import type { PlayerColorId } from "../../shared/types";

const PSEUDO_KEY = "games-party.pseudo";
const COLOR_KEY = "games-party.preferred-color";
const SOUND_KEY = "games-party.sound";

/** What the browser remembers between visits (docs/architecture.md, §4 and design-system §15). */

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable; the preference then lasts only for this visit.
  }
}

export function readPseudo(): string {
  return read(PSEUDO_KEY) ?? "";
}

export function writePseudo(pseudo: string): void {
  write(PSEUDO_KEY, pseudo);
}

/** The colour the player asks for. The server hands out the first free one if it is taken (§4). */
export function readPreferredColor(): PlayerColorId {
  const stored = read(COLOR_KEY);
  const known = PLAYER_COLOR_IDS.find((color) => color === stored);

  return known ?? PLAYER_COLOR_IDS[0];
}

export function writePreferredColor(color: PlayerColorId): void {
  write(COLOR_KEY, color);
}

/** Sound is on by default (docs/design-system.md, §15). */
export function readSoundEnabled(): boolean {
  return read(SOUND_KEY) !== "off";
}

export function writeSoundEnabled(enabled: boolean): void {
  write(SOUND_KEY, enabled ? "on" : "off");
}
