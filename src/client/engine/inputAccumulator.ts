import { CURSOR_SENSITIVITY, MAX_INPUT_DELTA } from "../../shared/constants";

export interface InputAccumulator {
  /** One `mousemove` while the pointer is locked, in CSS pixels. */
  add: (movementX: number, movementY: number, scale: number) => void;
  /** Everything gathered since the last call, and empties the accumulator. */
  take: () => { dx: number; dy: number };
  /** The same, without emptying: the prediction needs what is not sent yet (§6.5). */
  peek: () => { dx: number; dy: number };
  /** Drops what was gathered without sending it, when the pointer lock is lost. */
  clear: () => void;
}

/**
 * Turns mouse movement into arena units and adds it up between two sends
 * (docs/architecture.md, §6.5). The conversion is `delta / scale × CURSOR_SENSITIVITY`: `scale` is
 * in CSS pixels, like `movementX/Y`, so a dense screen changes nothing to how far a cursor goes.
 */
export function createInputAccumulator(): InputAccumulator {
  let dx = 0;
  let dy = 0;

  return {
    add: (movementX, movementY, scale) => {
      if (scale <= 0) {
        // The arena has no size yet: converting would divide by zero.
        return;
      }

      dx += (movementX / scale) * CURSOR_SENSITIVITY;
      dy += (movementY / scale) * CURSOR_SENSITIVITY;
    },

    take: () => {
      // The schema refuses anything larger, so a long pause with the mouse moving must not turn
      // into a message the server drops whole (§6.5, §9).
      const taken = { dx: clampDelta(dx), dy: clampDelta(dy) };
      dx = 0;
      dy = 0;
      return taken;
    },

    peek: () => ({ dx: clampDelta(dx), dy: clampDelta(dy) }),

    clear: () => {
      dx = 0;
      dy = 0;
    },
  };
}

function clampDelta(value: number): number {
  return Math.min(MAX_INPUT_DELTA, Math.max(-MAX_INPUT_DELTA, value));
}
