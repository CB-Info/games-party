import type { PLAYER_COLOR_IDS } from "./constants";

/** One of the ten player colours, `c1` to `c10` (docs/architecture.md, §4). */
export type PlayerColorId = (typeof PLAYER_COLOR_IDS)[number];

/** What a room is doing (docs/architecture.md, §5.2). */
export type RoomStatus = "lobby" | "playing" | "results";

/** A member of a room, as every other member sees them. */
export interface Player {
  playerId: string;
  pseudo: string;
  color: PlayerColorId;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  /** A spectator joined during a game and plays again when the room returns to the lobby. */
  isSpectator: boolean;
}

/** One line of the room's running leaderboard (docs/architecture.md, §5.6). */
export interface CumulativeStanding {
  playerId: string;
  points: number;
  place: number;
  /** Place before the last game, so that the client can show the progression arrow. */
  previousPlace: number;
}

/** One line of a finished game's ranking (docs/architecture.md, §5.6). */
export interface GameRankingLine {
  playerId: string;
  place: number;
  score: number;
  pointsAwarded: number;
}

/** Everything a finished game hands back to the room (docs/architecture.md, §5.6). */
export interface GameResults {
  ranking: GameRankingLine[];
  cumulative: CumulativeStanding[];
}

/** The whole room state, broadcast on every change (docs/architecture.md, §6.2). */
export interface RoomState {
  code: string;
  status: RoomStatus;
  hostId: string | null;
  players: Player[];
  /** Null while the host has not chosen a game yet (docs/architecture.md, §5.3). */
  selectedGameId: string | null;
  /** Options of the selected game, already normalised by the server. */
  selectedGameOptions: unknown;
  readyPlayerIds: string[];
  cumulative: CumulativeStanding[];
  /** Results of the last game, present while the room is showing them. */
  lastResults: GameResults | null;
}

/** A player as the invitation screen shows them, without any identifier (docs/architecture.md, §5.7). */
export interface RoomPreviewPlayer {
  pseudo: string;
  color: PlayerColorId;
  isHost: boolean;
}

/** Snapshot of a room, answered without joining it (docs/architecture.md, §5.7). */
export interface RoomPreview {
  hostPseudo: string | null;
  players: RoomPreviewPlayer[];
  playerCount: number;
  capacity: number;
  status: "lobby" | "in_game";
  selectedGameId: string | null;
}

/** A game view, sent to one recipient at each tick (docs/architecture.md, §6.3). */
export interface GameViewPayload {
  tick: number;
  serverTime: number;
  view: unknown;
}
