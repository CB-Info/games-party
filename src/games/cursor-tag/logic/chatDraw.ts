import { shuffle } from "../../../shared/shuffle";
import { CHAT_COUNT_MIN } from "../shared/constants";

/**
 * How many Chats a round starts with (rules.md, §4, step 2): the number the host set, but always
 * one Runner left among the players still in the game and among the connected ones, and never
 * fewer than one Chat.
 */
export function chatCountFor(
  chatCount: number,
  playerCount: number,
  connectedCount: number,
): number {
  return Math.max(CHAT_COUNT_MIN, Math.min(chatCount, playerCount - 1, connectedCount - 1));
}

/**
 * Draws the Chats of a round (rules.md, §4, step 3) among the connected players, and the rest among
 * the others only when there are too few. Nobody is left out: last round's Chat may be drawn again.
 */
export function drawChats(
  playerIds: readonly string[],
  count: number,
  isConnected: (playerId: string) => boolean,
  random: () => number,
): string[] {
  const connected = shuffle(playerIds.filter(isConnected), random);
  if (connected.length >= count) {
    return connected.slice(0, count);
  }

  const away = shuffle(
    playerIds.filter((playerId) => !isConnected(playerId)),
    random,
  );
  return [...connected, ...away.slice(0, count - connected.length)];
}
