import { customAlphabet } from "nanoid";

import type { RegisteredGame } from "../../games/defineGame";
import {
  EMPTY_ROOM_TTL_MS,
  MAX_ROOMS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from "../../shared/constants";
import { Room } from "./Room";
import type { RoomOutbound } from "./roomOutbound";

const generateCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

export interface RoomManagerDeps {
  /** One outbound per room, so that each broadcasts to its own Socket.IO room. */
  outboundFor: (code: string) => RoomOutbound;
  findGame: (gameId: string) => RegisteredGame | null;
  random: () => number;
  now: () => number;
  /** Passed in so that tests can shorten them instead of waiting. */
  emptyRoomTtlMs?: number;
  reconnectGraceMs?: number;
  resultsAutoReturnMs?: number;
}

/** Every live room of the server (docs/architecture.md, §5.1). */
export class RoomManager {
  private readonly deps: RoomManagerDeps;
  private readonly rooms = new Map<string, Room>();

  constructor(deps: RoomManagerDeps) {
    this.deps = deps;
  }

  get size(): number {
    return this.rooms.size;
  }

  /** Opens a room, unless the server already holds `MAX_ROOMS` of them (§5.1). */
  create(): Room | null {
    if (this.rooms.size >= MAX_ROOMS) {
      return null;
    }

    const code = this.freeCode();
    const room = new Room({
      code,
      outbound: this.deps.outboundFor(code),
      findGame: this.deps.findGame,
      random: this.deps.random,
      now: this.deps.now,
      reconnectGraceMs: this.deps.reconnectGraceMs,
      resultsAutoReturnMs: this.deps.resultsAutoReturnMs,
    });

    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | null {
    return this.rooms.get(code) ?? null;
  }

  delete(code: string): void {
    const room = this.rooms.get(code);
    if (room !== undefined) {
      room.dispose();
      this.rooms.delete(code);
    }
  }

  /** Deletes the rooms that have been empty for longer than their lifetime (§5.1). */
  pruneEmpty(now: number): void {
    const ttl = this.deps.emptyRoomTtlMs ?? EMPTY_ROOM_TTL_MS;

    for (const [code, room] of this.rooms) {
      if (room.isEmpty && now - room.emptyAt >= ttl) {
        this.delete(code);
      }
    }
  }

  disposeAll(): void {
    for (const room of this.rooms.values()) {
      room.dispose();
    }
    this.rooms.clear();
  }

  /** A code nobody holds. Collisions are vanishingly rare, but cost nothing to rule out. */
  private freeCode(): string {
    let code = generateCode();
    while (this.rooms.has(code)) {
      code = generateCode();
    }
    return code;
  }
}
