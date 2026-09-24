import type { Point } from "../../../shared/cursor/collision";
import { shuffle } from "../../../shared/shuffle";
import { SPAWN_POINTS } from "../shared/map";
import { chatCountFor, drawChats } from "./chatDraw";
import type { Outcome, PreparationState, RoundState, RuleContext } from "./cursorTagState";

/**
 * Starts a round at the end of its preparation's countdown (rules.md, §4, steps 1 to 6). The spawn
 * points are shuffled first, then the Chats drawn, both with the game's randomness. Everyone starts
 * standing on their spawn point with nothing in hand and nothing owed; scores and input counts carry
 * over. The Chats are frozen, the Runners free to go.
 */
export function startRound(preparation: PreparationState, rules: RuleContext): Outcome<RoundState> {
  const spawns = shuffle(SPAWN_POINTS, rules.random);
  const playerIds = preparation.players.map((player) => player.playerId);
  const count = chatCountFor(
    rules.settings.chatCount,
    playerIds.length,
    playerIds.filter(rules.isConnected).length,
  );
  const chatIds = drawChats(playerIds, count, rules.isConnected, rules.random);

  const players = preparation.players.map((member, index) => {
    // There are as many spawn points as seats in a game (MAX_PLAYERS): everyone has one.
    const spawn = spawns[index] as Point;
    const isChat = chatIds.includes(member.playerId);

    return {
      ...member,
      role: isChat ? ("chat" as const) : ("runner" as const),
      position: spawn,
      tickStart: spawn,
      budget: 0,
      backlog: { x: 0, y: 0 },
      frozenMsLeft: isChat ? rules.settings.freezeMs : 0,
      portalCooldownMs: { A: 0, B: 0 },
    };
  });

  return {
    state: {
      phase: "round",
      round: preparation.round,
      players,
      timeLeftMs: rules.settings.roundMs,
      chatsAtStart: chatIds.length,
    },
    events: [{ type: "roundStart", round: preparation.round, chatIds }],
  };
}
