import { MAX_SIMULATED_LAG_MS } from "../../shared/constants";

/**
 * Reads the `?lag=` of a query string, for the development latency simulator. Anything that is
 * not a usable number means no delay, and the value is capped: a figure typed by hand could
 * otherwise freeze the page for minutes.
 */
export function readLagMs(search: string): number {
  return readMs(search, "lag");
}

/**
 * Reads `?holeIn=` or `?holeOut=`, the length of the holes the simulator opens in one direction:
 * `holeIn` holds back what the client receives, `holeOut` what it sends. Same rules as `?lag`.
 */
export function readHoleMs(search: string, name: "holeIn" | "holeOut"): number {
  return readMs(search, name);
}

function readMs(search: string, name: string): number {
  const raw = new URLSearchParams(search).get(name);
  if (raw === null) {
    return 0;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(MAX_SIMULATED_LAG_MS, Math.round(value));
}
