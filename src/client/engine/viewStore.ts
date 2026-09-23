import type { ViewSample, ViewStore } from "../../games/gameView.types";
import { INTERPOLATION_BUFFER_MS } from "../../shared/constants";

/**
 * Keeps the last `INTERPOLATION_BUFFER_MS` of views, so that the other cursors can be drawn a
 * little in the past and move smoothly rather than jumping from tick to tick (§6.5).
 */
export function createViewStore(): ViewStore {
  let samples: ViewSample[] = [];

  return {
    push: (payload, receivedAt) => {
      // A view that arrives out of order is dropped: it would make the list non-monotonic and
      // every search below assumes it is sorted.
      const last = samples.at(-1);
      if (last !== undefined && payload.serverTime <= last.serverTime) {
        return;
      }

      samples.push({
        tick: payload.tick,
        serverTime: payload.serverTime,
        receivedAt,
        view: payload.view,
      });

      const oldestKept = payload.serverTime - INTERPOLATION_BUFFER_MS;
      samples = samples.filter((sample) => sample.serverTime >= oldestKept);
    },

    latest: () => samples.at(-1) ?? null,

    sampleAt: (serverTime) => {
      const first = samples.at(0);
      if (first === undefined) {
        return null;
      }

      // Before anything known, or after everything known: the nearest view, without interpolating.
      if (serverTime <= first.serverTime) {
        return { from: first, to: null, t: 0 };
      }

      for (let index = samples.length - 1; index >= 0; index -= 1) {
        const from = samples[index];
        if (from === undefined || from.serverTime > serverTime) {
          continue;
        }

        const to = samples[index + 1];
        if (to === undefined) {
          return { from, to: null, t: 0 };
        }

        const span = to.serverTime - from.serverTime;
        return { from, to, t: span === 0 ? 0 : (serverTime - from.serverTime) / span };
      }

      return null;
    },

    clear: () => {
      samples = [];
    },
  };
}
