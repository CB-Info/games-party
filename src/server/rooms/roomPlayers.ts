import { PLAYER_COLOR_IDS } from "../../shared/constants";
import { pseudoKey } from "../../shared/pseudo";
import type { PlayerColorId } from "../../shared/types";
import type { RoomMember } from "./roomMember";

/**
 * The preferred colour when it is free, otherwise the first free one in the fixed `c1` → `c10`
 * order (docs/architecture.md, §4).
 */
export function pickColor(
  members: readonly RoomMember[],
  preferred: PlayerColorId,
): PlayerColorId | null {
  const taken = new Set(members.map((member) => member.color));

  if (!taken.has(preferred)) {
    return preferred;
  }

  return PLAYER_COLOR_IDS.find((color) => !taken.has(color)) ?? null;
}

/** True when a pseudo is already used in the room, whatever its case (docs/architecture.md, §4). */
export function isPseudoTaken(
  members: readonly RoomMember[],
  pseudo: string,
  exceptPlayerId?: string,
): boolean {
  const key = pseudoKey(pseudo);

  return members.some(
    (member) => member.playerId !== exceptPlayerId && pseudoKey(member.pseudo) === key,
  );
}

/**
 * Next host: the human who has been here the longest among those connected, and failing that the
 * oldest human of all, so that the room always has a host until its members are removed. A bot is
 * never a host (docs/architecture.md, §5.3).
 */
export function electHost(members: readonly RoomMember[]): string | null {
  const humans = members.filter((member) => !member.isBot);
  const byArrival = [...humans].sort((a, b) => a.joinedAt - b.joinedAt);

  const connected = byArrival.find((member) => member.connected);
  return (connected ?? byArrival[0])?.playerId ?? null;
}

/** True when the room no longer holds a single human, bots excluded (docs/architecture.md, §5.1). */
export function isRoomEmpty(members: readonly RoomMember[]): boolean {
  return members.every((member) => member.isBot);
}
