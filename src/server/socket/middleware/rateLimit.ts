import {
  MAX_JOIN_FAILURES_PER_MINUTE,
  RATE_LIMIT_KICK_AFTER_MS,
  RATE_LIMIT_MESSAGES_PER_SECOND,
} from "../../../shared/constants";

const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = 60000;

/** Counts events over a sliding window (docs/architecture.md, §9). */
class SlidingWindow {
  private readonly timestamps: number[] = [];
  private readonly windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  record(now: number): number {
    this.timestamps.push(now);
    this.forget(now);
    return this.timestamps.length;
  }

  count(now: number): number {
    this.forget(now);
    return this.timestamps.length;
  }

  private forget(now: number): void {
    while (this.timestamps.length > 0 && now - (this.timestamps[0] ?? 0) >= this.windowMs) {
      this.timestamps.shift();
    }
  }
}

export interface RateLimiterOptions {
  messagesPerSecond?: number;
  kickAfterMs?: number;
  joinFailuresPerMinute?: number;
}

/**
 * The per-socket protections of docs/architecture.md, §9: a message budget per sliding second, a
 * disconnection when the budget stays exceeded, and a budget of unknown-room failures per minute.
 */
export class SocketRateLimiter {
  private readonly messages = new SlidingWindow(ONE_SECOND_MS);
  private readonly joinFailures = new SlidingWindow(ONE_MINUTE_MS);
  private readonly messagesPerSecond: number;
  private readonly kickAfterMs: number;
  private readonly joinFailuresPerMinute: number;
  private overLimitSince: number | null = null;

  constructor(options: RateLimiterOptions = {}) {
    this.messagesPerSecond = options.messagesPerSecond ?? RATE_LIMIT_MESSAGES_PER_SECOND;
    this.kickAfterMs = options.kickAfterMs ?? RATE_LIMIT_KICK_AFTER_MS;
    this.joinFailuresPerMinute = options.joinFailuresPerMinute ?? MAX_JOIN_FAILURES_PER_MINUTE;
  }

  /**
   * Records one incoming message. `allowed` is false when it is over budget, and `kick` is true
   * once the budget has stayed exceeded for the whole kick delay.
   */
  admit(now: number): { allowed: boolean; kick: boolean } {
    const count = this.messages.record(now);

    if (count <= this.messagesPerSecond) {
      this.overLimitSince = null;
      return { allowed: true, kick: false };
    }

    this.overLimitSince ??= now;
    return { allowed: false, kick: now - this.overLimitSince >= this.kickAfterMs };
  }

  /**
   * Records an unknown-room failure and reports whether the socket is now rate limited. Only
   * `ROOM_NOT_FOUND` counts: the other refusals come from legitimate players (§9).
   */
  recordJoinFailure(now: number): boolean {
    return this.joinFailures.record(now) > this.joinFailuresPerMinute;
  }

  isJoinLimited(now: number): boolean {
    return this.joinFailures.count(now) >= this.joinFailuresPerMinute;
  }
}
