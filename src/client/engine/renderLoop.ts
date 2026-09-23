export interface RenderLoop {
  start: () => void;
  stop: () => void;
}

/**
 * Drives a drawing function once per frame. This is where the high-frequency data lives: the loop
 * reads refs and draws on a canvas, and React never learns that anything moved (règle d'or 4).
 */
export function createRenderLoop(draw: (now: number) => void): RenderLoop {
  let frame: number | null = null;

  const step = (now: number): void => {
    draw(now);
    frame = requestAnimationFrame(step);
  };

  return {
    start: () => {
      if (frame === null) {
        frame = requestAnimationFrame(step);
      }
    },

    stop: () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
  };
}
