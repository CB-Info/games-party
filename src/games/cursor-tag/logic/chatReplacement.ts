import { CHAT_COUNT_MIN } from "../shared/constants";
import {
  updatePlayer,
  type Outcome,
  type RoundPlayer,
  type RoundState,
  type RuleContext,
} from "./cursorTagState";

/**
 * Replaces a Chat who left a round, by losing their connection or being removed: one rule for
 * both (rules.md, §11). Called once the departure is known: the Chat is away, or already gone
 * from the players.
 *
 * The Chat is replaced if the connected Chats left are fewer than the smallest of the number the
 * host set, one fewer than the connected players (at least one), and the Chats the round started
 * with. The replacement is a connected Runner drawn at random, who becomes a Chat with no freeze
 * and keeps what they owe. One departure has one replacement at most, never the last connected
 * Runner: a replacement repairs a departure, and never adds a Chat. A Chat who is away and
 * replaced becomes a Runner, with no freeze, since only a Chat can be frozen.
 */
export function replaceDepartedChat(
  state: RoundState,
  departedId: string,
  rules: RuleContext,
): Outcome<RoundState> {
  const connected = state.players.filter((player) => rules.isConnected(player.playerId));
  const activeChats = connected.filter((player) => player.role === "chat").length;
  const runners = connected.filter((player) => player.role === "runner");
  const cap = Math.min(
    rules.settings.chatCount,
    Math.max(CHAT_COUNT_MIN, connected.length - 1),
    state.chatsAtStart,
  );

  if (activeChats >= cap || runners.length <= 1) {
    return { state, events: [] };
  }

  // At least two Runners to draw from, so the index always falls on one.
  const newChat = runners[Math.floor(rules.random() * runners.length)] as RoundPlayer;
  const withNewChat = updatePlayer(state.players, newChat.playerId, (player): RoundPlayer => ({
    ...player,
    role: "chat",
  }));
  const players = updatePlayer(withNewChat, departedId, (player): RoundPlayer => ({
    ...player,
    role: "runner",
    frozenMsLeft: 0,
  }));

  return {
    state: { ...state, players },
    events: [{ type: "chatReplaced", previousChatId: departedId, newChatId: newChat.playerId }],
  };
}
