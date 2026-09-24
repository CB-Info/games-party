import {
  updatePlayer,
  type Outcome,
  type RoundPlayer,
  type RoundState,
  type RuleContext,
} from "./cursorTagState";
import { breakPaths } from "./tickPaths";

/**
 * Replaces a Chat who left a round, by losing their connection or being removed: one rule for
 * both (rules.md, §11). Called once the departure is known: the Chat is away, or already gone
 * from the players.
 *
 * The Chat is replaced by a connected Runner drawn at random, as long as at least two are left:
 * the last connected Runner is never taken. One departure has one replacement at most, so a round
 * never has more Chats than it started with, and no other limit needs checking. The replacement
 * becomes a Chat with no freeze and keeps what they owe. A Chat who is away and replaced becomes a
 * Runner, with no freeze, since only a Chat can be frozen. Both role changes cut the rewind.
 */
export function replaceDepartedChat(
  state: RoundState,
  departedId: string,
  rules: RuleContext,
): Outcome<RoundState> {
  const runners = state.players.filter(
    (player) => player.role === "runner" && rules.isConnected(player.playerId),
  );
  if (runners.length < 2) {
    return { state, events: [] };
  }

  // At least two Runners to draw from, so the index always falls on one.
  const newChat = runners[Math.floor(rules.random() * runners.length)] as RoundPlayer;
  const withNewChat = updatePlayer(state.players, newChat.playerId, (player): RoundPlayer => ({
    ...breakPaths(player),
    role: "chat",
  }));
  const players = updatePlayer(withNewChat, departedId, (player): RoundPlayer => ({
    ...breakPaths(player),
    role: "runner",
    frozenMsLeft: 0,
  }));

  return {
    state: { ...state, players },
    events: [{ type: "chatReplaced", previousChatId: departedId, newChatId: newChat.playerId }],
  };
}
