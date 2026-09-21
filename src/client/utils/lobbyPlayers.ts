import type { Player } from "../../shared/types";

/**
 * Order of the player list: the host first, then everyone else in the order they arrived
 * (docs/design-system.md, §11.10). The server already sends them in arrival order, so only the
 * host moves — the list stays still when somebody disconnects or changes colour.
 */
export function orderLobbyPlayers(players: readonly Player[], hostId: string | null): Player[] {
  const host = players.filter((player) => player.playerId === hostId);
  const others = players.filter((player) => player.playerId !== hostId);

  return [...host, ...others];
}

/**
 * Players counted by the ready counter: the host agrees by starting, and a disconnected player
 * never blocks a launch (docs/design-system.md, §11.12, docs/architecture.md, §5.3).
 */
export function countableForReady(players: readonly Player[], hostId: string | null): Player[] {
  return players.filter(
    (player) => player.playerId !== hostId && player.connected && !player.isSpectator,
  );
}

/** How many of those players have declared themselves ready. */
export function countReady(
  players: readonly Player[],
  hostId: string | null,
  readyPlayerIds: readonly string[],
): { ready: number; total: number } {
  const countable = countableForReady(players, hostId);

  return {
    ready: countable.filter((player) => readyPlayerIds.includes(player.playerId)).length,
    total: countable.length,
  };
}
