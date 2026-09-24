import { shuffle } from "../../../shared/shuffle";
import { TAG_DISTANCE } from "../shared/constants";
import type { RoundPlayer, RuleContext } from "./cursorTagState";
import { firstContactTime } from "./pathGeometry";
import { currentPath, runnerPathAgainst } from "./tickPaths";

/** A Chat and a Runner whose paths came within reach, and the first instant they did (0 to 1). */
export interface Contact {
  chatId: string;
  runnerId: string;
  time: number;
}

/**
 * Every contact of the tick (rules.md, §6.3), earliest first: the Chat's path this tick against
 * the Runner's, rewound when the game rewinds. Only a Chat who is connected and not
 * frozen can tag, and only a connected Runner can be tagged: read once, for the whole tick. At
 * exactly the same instant, the order is drawn with the game's randomness, so that no player wins
 * every tie of the evening; nothing is drawn when there is no tie.
 */
export function findContacts(players: readonly RoundPlayer[], rules: RuleContext): Contact[] {
  const chats = players.filter(
    (player) =>
      player.role === "chat" && player.frozenMsLeft === 0 && rules.isConnected(player.playerId),
  );
  const runners = players.filter(
    (player) => player.role === "runner" && rules.isConnected(player.playerId),
  );

  const contacts = chats.flatMap((chat) =>
    runners.flatMap((runner) => {
      const time = firstContactTime(
        currentPath(chat),
        runnerPathAgainst(chat, runner),
        TAG_DISTANCE,
      );
      return time === null ? [] : [{ chatId: chat.playerId, runnerId: runner.playerId, time }];
    }),
  );

  const times = [...new Set(contacts.map((contact) => contact.time))].sort((a, b) => a - b);
  return times.flatMap((time) =>
    shuffle(
      contacts.filter((contact) => contact.time === time),
      rules.random,
    ),
  );
}
