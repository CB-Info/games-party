import type { TagEvent } from "../shared/types";
import { updatePlayer, type RoundPlayer } from "./cursorTagState";
import type { Contact } from "./tagContacts";
import { breakPaths } from "./tickPaths";

/**
 * Applies the tick's contacts in their order (rules.md, §6.3). A Chat tags the first Runner they
 * meet, and a Runner reached by several Chats is tagged by the first. A player whose role has just
 * changed takes no further part in the tick: every later contact of theirs is skipped.
 *
 * The tagged Runner becomes a Chat, frozen where they stand, with nothing in hand and nothing
 * owed. The Chat who tagged becomes a Runner with no freeze, and keeps their remainder: it is cut
 * to a Runner's leash by their next move. A role change cuts both players' rewind.
 */
export function resolveTags(
  players: readonly RoundPlayer[],
  contacts: readonly Contact[],
  freezeMs: number,
): { players: RoundPlayer[]; events: TagEvent[] } {
  const changed = new Set<string>();
  const events: TagEvent[] = [];
  let resolved = [...players];

  for (const { chatId, runnerId } of contacts) {
    if (changed.has(chatId) || changed.has(runnerId)) {
      continue;
    }

    resolved = updatePlayer(resolved, chatId, (player) => ({
      ...breakPaths(player),
      role: "runner",
    }));
    resolved = updatePlayer(resolved, runnerId, (player) => ({
      ...breakPaths(player),
      role: "chat",
      frozenMsLeft: freezeMs,
      budget: 0,
      backlog: { x: 0, y: 0 },
    }));
    changed.add(chatId).add(runnerId);
    events.push({ type: "tag", chatId, taggedId: runnerId });
  }

  return { players: resolved, events };
}
