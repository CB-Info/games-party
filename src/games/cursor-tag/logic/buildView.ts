import type { Point } from "../../../shared/cursor/collision";
import {
  VIEW_OWN_PRECISION,
  VIEW_STATE_CHAT_OR_READY,
  VIEW_STATE_CONNECTED,
} from "../shared/constants";
import type {
  CursorTagWireView,
  WireMe,
  WirePreparationPlayer,
  WireRoundPlayer,
} from "../shared/types";
import {
  findPlayer,
  type PreparationState,
  type RoundPlayer,
  type RoundState,
} from "./cursorTagState";

/** Who a view is for: a player of the game, or a spectator (docs/architecture.md, §7). */
export type Viewer = { playerId: string } | { spectator: true };

/**
 * The compact view one recipient receives (rules.md, §8.2). Everything is public, so every
 * recipient sees the same players; only `me` is theirs alone, and a spectator has none. There is
 * no view of a game that is over: the room shows the results instead, and asks for none.
 */
export function buildView(
  state: PreparationState | RoundState,
  viewer: Viewer,
  isConnected: (playerId: string) => boolean,
): CursorTagWireView {
  const viewerId = "playerId" in viewer ? viewer.playerId : null;

  return state.phase === "round"
    ? roundView(state, viewerId, isConnected)
    : preparationView(state, viewerId, isConnected);
}

function preparationView(
  state: PreparationState,
  viewerId: string | null,
  isConnected: (playerId: string) => boolean,
): CursorTagWireView {
  const players = state.players.map((player): WirePreparationPlayer => [
    player.playerId,
    stateBits(isConnected(player.playerId), state.readyIds.includes(player.playerId)),
    Math.round(player.scoreMs),
  ]);
  const me = viewerId === null ? undefined : findPlayer(state.players, viewerId);
  // Nothing to spend and nothing to cool down before a round: only the input count matters.
  const m: WireMe | undefined = me === undefined ? undefined : [me.lastProcessedSeq, 0, 0, 0];

  return state.step.kind === "waiting"
    ? withMe({ ph: 0, r: state.round, a: Math.round(state.step.autoStartMsLeft), p: players }, m)
    : withMe({ ph: 0, r: state.round, c: Math.round(state.step.countdownMsLeft), p: players }, m);
}

function roundView(
  state: RoundState,
  viewerId: string | null,
  isConnected: (playerId: string) => boolean,
): CursorTagWireView {
  const players = state.players.map((player): WireRoundPlayer => {
    // Other cursors are interpolated, and a unit is less than a pixel. The recipient's own
    // position is where their prediction starts from: rounded to the unit, it can end up inside
    // a wall corner the real one clears, and the replay would then stop against it (§8.2).
    const round = player.playerId === viewerId ? toOwnPrecision : Math.round;

    return [
      player.playerId,
      round(player.position.x),
      round(player.position.y),
      stateBits(isConnected(player.playerId), player.role === "chat"),
      Math.round(player.frozenMsLeft),
      Math.round(player.scoreMs),
    ];
  });
  const me = viewerId === null ? undefined : findPlayer(state.players, viewerId);

  return withMe(
    { ph: 1, r: state.round, t: Math.round(state.timeLeftMs), p: players },
    me === undefined ? undefined : roundMe(me),
  );
}

/** The remainder travels only when there is one left once rounded (rules.md, §8.2). */
function roundMe(player: RoundPlayer): WireMe {
  const counts: WireMe = [
    player.lastProcessedSeq,
    toOwnPrecision(player.budget),
    Math.round(player.portalCooldownMs.A),
    Math.round(player.portalCooldownMs.B),
  ];
  const backlog: Point = {
    x: toOwnPrecision(player.backlog.x),
    y: toOwnPrecision(player.backlog.y),
  };

  return backlog.x === 0 && backlog.y === 0 ? counts : [...counts, backlog.x, backlog.y];
}

/** Leaves `m` out rather than sending it empty: a spectator has no `me` (rules.md, §8.2). */
function withMe<View extends CursorTagWireView>(view: View, m: WireMe | undefined): View {
  return m === undefined ? view : { ...view, m };
}

function stateBits(connected: boolean, chatOrReady: boolean): number {
  return (connected ? VIEW_STATE_CONNECTED : 0) + (chatOrReady ? VIEW_STATE_CHAT_OR_READY : 0);
}

function toOwnPrecision(value: number): number {
  return Math.round(value * VIEW_OWN_PRECISION) / VIEW_OWN_PRECISION;
}
