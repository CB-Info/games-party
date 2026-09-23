import { afterSimulatedLag, simulatedLagMs, throughSimulatedHole } from "./simulatedLatency";

/**
 * Everything that crosses the wire, delayed by the development latency simulator
 * (docs/architecture.md, §8.1). Gathered here rather than spread through the socket client and the
 * two request modules: the delay and the holes apply in both directions, and one place is where
 * that stays true. With no simulated latency these are three pass-throughs.
 */

/**
 * Delays a listener. Written as a wrapper rather than a generic subscriber because a generic
 * event name loses the listener's own types, which the protocol exists to keep.
 */
export function delayed<Args extends unknown[]>(listener: (...args: Args) => void) {
  return (...args: Args): void =>
    afterSimulatedLag(() => throughSimulatedHole("in", () => listener(...args)));
}

/**
 * Sends a request and waits for its answer, delayed on the way out and on the way back: a real
 * network costs the latency twice, and a simulator charging it once would flatter the client.
 */
export async function request<Answer>(send: () => Promise<Answer>): Promise<Answer> {
  await holeDelay("out");
  await lagDelay();
  const answer = await send();
  await lagDelay();
  await holeDelay("in");
  return answer;
}

/** Sends something the server never answers (docs/architecture.md, §6.2). */
export function fireAndForget(send: () => void): void {
  throughSimulatedHole("out", () => afterSimulatedLag(send));
}

function lagDelay(): Promise<void> {
  return simulatedLagMs() === 0
    ? Promise.resolve()
    : new Promise((resolve) => afterSimulatedLag(resolve));
}

function holeDelay(way: "in" | "out"): Promise<void> {
  return new Promise((resolve) => throughSimulatedHole(way, resolve));
}
