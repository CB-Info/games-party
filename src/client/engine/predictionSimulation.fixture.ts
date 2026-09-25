import { ARENA_WIDTH, INPUT_SEND_RATE, SERVER_TICK_RATE } from "../../shared/constants";
import { distance, type Wall } from "../../shared/cursor/collision";
import { NO_SEQ_PROCESSED } from "../../shared/cursor/cursorInput";
import { createSimulatedClient, type DrawnFrame } from "./simulatedClient.fixture";
import {
  createServerState,
  serverTick,
  type StepSetup,
  type Travelling,
  type View,
} from "./simulatedServer.fixture";

/** One frame of a sixty-a-second screen, in milliseconds. */
const FRAME_MS = 16;

export interface SimulationSetup extends StepSetup {
  /** How fast the mouse is moved, in CSS pixels per second. */
  mousePixelsPerSecond: number;
  /** Displayed width of the arena, in CSS pixels: it decides how many units a pixel is worth. */
  arenaPixels: number;
  /** One-way network delay, in milliseconds. Zero is the same machine with nothing in between. */
  lagMs?: number;
  walls?: readonly Wall[];
  durationMs?: number;
  /** Time with the mouse still at the end of the run, to see whether the two sides settle. */
  idleMs?: number;
  /**
   * A hole in one direction: everything that would arrive during it arrives when it ends, as TCP
   * delivers what a lost packet held back. `in` holds the views, `out` the inputs.
   */
  hole?: { way: "in" | "out"; at: number; ms: number };
}

export interface SimulationResult {
  /** Largest disagreement between the predicted and the official position, in units. */
  maxGap: number;
  /** Share of sends the budget had to shorten, between 0 and 1. */
  truncatedShare: number;
  /** Units the budget refused over the whole run, and never gave back. */
  truncatedUnits: number;
  /** Units the mouse asked for over the whole run. */
  asked: number;
  /**
   * Largest jump of the predicted position when a view lands — the symptom, since the drawn cursor
   * follows the prediction — over the run, and once every input is applied and the hand is still.
   * That second one must stay at zero: a prediction jumping then is not gliding with the server.
   */
  maxPredictionJump: number;
  maxStillJump: number;
  /** Disagreement once the mouse has been still long enough for everything to be applied: zero. */
  settledGap: number;
  /** Corrections too large to hide, which the drawn cursor took at once: the jumps seen. */
  snaps: number;
  /**
   * Largest movement of the drawn cursor in one frame **beyond** what the hand asked for. Moving
   * less is a correction being hidden, which is the point of the smoothing; moving more is a jump.
   */
  maxDrawnJerk: number;
}

/**
 * Runs the real server loop and the real client prediction side by side, with a mouse moved at a
 * chosen speed, and measures how far apart they end up — in either mode of the engine.
 *
 * Two details decide whether this measures anything at all. The sends are **out of phase** with
 * the ticks: both run at thirty a second, and lining them up would have every input applied the
 * instant it was sent, which no real client ever enjoys. And messages take `lagMs` to travel each
 * way, so the client really does hold inputs the server has not seen.
 */
export function runPredictionSimulation(setup: SimulationSetup): SimulationResult {
  const walls = setup.walls ?? [];
  const movingMs = setup.durationMs ?? 3000;
  const durationMs = movingMs + (setup.idleMs ?? 500);
  const lagMs = setup.lagMs ?? 0;
  const tickMs = Math.round(1000 / SERVER_TICK_RATE);
  const sendMs = Math.round(1000 / INPUT_SEND_RATE);
  const scale = setup.arenaPixels / ARENA_WIDTH;
  const unitsPerMs = setup.mousePixelsPerSecond / scale / 1000;

  const server = createServerState();
  const client = createSimulatedClient(setup, walls, { ...server, seq: NO_SEQ_PROCESSED });
  const travelling: Travelling[] = [];
  const returning: Array<{ view: View; arrivesAt: number }> = [];
  let direction = 1;

  const totals = { asked: 0, travelled: 0, truncatedUnits: 0, truncatedSends: 0, sends: 0 };
  let maxGap = 0;
  let maxPredictionJump = 0;
  let maxStillJump = 0;
  let settledGap = 0;
  let snaps = 0;
  let maxDrawnJerk = 0;
  let frameBefore: DrawnFrame | null = null;

  /** When something sent at `at` would arrive, the hole in its direction included. */
  function arrival(way: "in" | "out", at: number): number {
    const { hole } = setup;
    return hole?.way === way && at >= hole.at && at < hole.at + hole.ms ? hole.at + hole.ms : at;
  }

  for (let now = 1; now <= durationMs; now += 1) {
    // Half a tick out of phase: an input is sent while the server is between two steps.
    if (now <= movingMs && now % sendMs === Math.floor(tickMs / 2)) {
      const length = unitsPerMs * sendMs;
      const input = client.send(length * direction, now);

      travelling.push({ input, arrivesAt: arrival("out", now) + lagMs });
      totals.sends += 1;
      totals.asked += length;

      if (server.position.x > ARENA_WIDTH - 300 || server.position.x < 300) {
        direction = server.position.x < 300 ? 1 : -1;
      }
    }

    if (now % tickMs === 0) {
      const view = serverTick(server, travelling, now, tickMs, setup, walls, totals);
      returning.push({ view, arrivesAt: arrival("in", now + lagMs) });
    }

    // Still means nothing was waiting before this view either: the view that acknowledges the last
    // inputs brings the last correction of the gesture, not a glide.
    const still = now > movingMs && !client.hasPending();
    let latest: View | null = null;

    // Views that land together are taken as one, the last of them, as a frame of the renderer
    // takes the latest view it finds: acknowledging the last covers everything before it.
    while (returning.length > 0 && (returning[0]?.arrivesAt ?? Infinity) <= now) {
      latest = returning.shift()?.view ?? latest;
    }

    const landing = latest === null ? null : client.receive(latest, now);
    if (landing !== null) {
      const jump = distance(landing.before, landing.after);
      maxPredictionJump = Math.max(maxPredictionJump, jump);
      if (still) {
        maxStillJump = Math.max(maxStillJump, jump);
      }
      if (landing.snapped) {
        snaps += 1;
      }
    }

    if (now % FRAME_MS === 0) {
      const frame = client.frame(now, FRAME_MS);

      // What the hand asked for is the prediction's own movement; only going further is a jump.
      if (frameBefore !== null) {
        const asked = distance(frameBefore.predicted, frame.predicted);
        maxDrawnJerk = Math.max(maxDrawnJerk, distance(frameBefore.drawn, frame.drawn) - asked);
      }

      frameBefore = frame;
    }

    const gap = distance(client.predictAt(now), server.position);
    if (now <= movingMs) {
      maxGap = Math.max(maxGap, gap);
    }

    settledGap = gap;
  }

  return {
    maxGap,
    truncatedShare: totals.sends === 0 ? 0 : totals.truncatedSends / totals.sends,
    truncatedUnits: totals.truncatedUnits,
    asked: totals.asked,
    maxPredictionJump,
    maxStillJump,
    settledGap,
    snaps,
    maxDrawnJerk,
  };
}
