import type { PortalEvent } from "../shared/types";
import type { RoundPlayer, RoundState, RuleContext } from "./cursorTagState";
import { rechargeAtRoleSpeed } from "./movement";
import { moveAndTeleport } from "./portals";
import { breakPaths } from "./tickPaths";

/**
 * The steps of a round's tick that touch every player the same way (rules.md, §6.6). The tick
 * itself, which runs them in their order, is `roundTick.ts`.
 */

/**
 * Step 1: the round's time, the freezes and the portal cooldowns run down, never below zero. A
 * freeze that ends cuts the player's rewind (rules.md, §6.3).
 */
export function countDownTimers(state: RoundState, dtMs: number): RoundState {
  return {
    ...state,
    timeLeftMs: Math.max(0, state.timeLeftMs - dtMs),
    players: state.players.map((player) => {
      const counted = {
        ...player,
        frozenMsLeft: Math.max(0, player.frozenMsLeft - dtMs),
        portalCooldownMs: {
          A: Math.max(0, player.portalCooldownMs.A - dtMs),
          B: Math.max(0, player.portalCooldownMs.B - dtMs),
        },
      };
      return player.frozenMsLeft > 0 && counted.frozenMsLeft === 0 ? breakPaths(counted) : counted;
    }),
  };
}

/**
 * Step 2: every connected player who is not frozen pays what they still owe, from what is left of
 * their budget, and the portals are checked on that move. It comes before the tags, so that the
 * path it adds can be tagged, and before the recharge, so that a remainder never draws on more
 * than one reserve in a tick. Without catch-up, nobody ever owes anything.
 */
export function payBacklogs(
  players: readonly RoundPlayer[],
  rules: RuleContext,
): { players: RoundPlayer[]; events: PortalEvent[] } {
  const events: PortalEvent[] = [];

  const paid = players.map((player) => {
    const owes = player.backlog.x !== 0 || player.backlog.y !== 0;
    if (!owes || player.frozenMsLeft > 0 || !rules.isConnected(player.playerId)) {
      return player;
    }

    const moved = moveAndTeleport(player, { x: 0, y: 0 }, rules.settings.catchUpMs);
    events.push(...moved.events);
    return moved.player;
  });

  return { players: paid, events };
}

/**
 * Step 3: every connected Runner scores the round time this tick used up. On the last tick, that
 * is only what was left of the round, so that a few extra milliseconds never make a whole second.
 */
export function scoreRunners(
  players: readonly RoundPlayer[],
  elapsedMs: number,
  isConnected: (playerId: string) => boolean,
): RoundPlayer[] {
  return players.map((player) =>
    player.role === "runner" && isConnected(player.playerId)
      ? { ...player, scoreMs: player.scoreMs + elapsedMs }
      : player,
  );
}

/** Step 5: every player who is not frozen gets their budget for the next tick's inputs. */
export function rechargeBudgets(players: readonly RoundPlayer[], dtMs: number): RoundPlayer[] {
  return players.map((player) =>
    player.frozenMsLeft > 0 ? player : rechargeAtRoleSpeed(player, dtMs),
  );
}
