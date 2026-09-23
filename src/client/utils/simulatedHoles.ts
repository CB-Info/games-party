/**
 * When the hole the development simulator has open at `now` closes, or `null` if none is open. A
 * hole takes the last `holeMs` of every period of `everyMs`, so the first one comes a few seconds
 * after the page loads and leaves time to join a room.
 *
 * It is what TCP does after a lost packet: nothing arrives for a while, then everything that was
 * held back arrives at once. A steady `?lag` never produces that, since it delays every message by
 * the same amount and views keep their spacing.
 */
export function holeEndAt(now: number, holeMs: number, everyMs: number): number | null {
  if (holeMs <= 0 || everyMs <= 0) {
    return null;
  }

  const intoPeriod = now % everyMs;
  return intoPeriod >= everyMs - holeMs ? now - intoPeriod + everyMs : null;
}
