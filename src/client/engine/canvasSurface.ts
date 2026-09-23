import { backingSize } from "./arenaScale";

/**
 * Sizes a canvas for a displayed size. The buffer holds device pixels so that the drawing is
 * crisp on a dense screen, and the context is scaled once so that every `draw` function keeps
 * reasoning in CSS pixels (docs/design-system.md, §12).
 */
export function sizeCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): CanvasRenderingContext2D | null {
  const { width, height, ratio } = backingSize(cssWidth, cssHeight, devicePixelRatio);

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const context = canvas.getContext("2d");
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);

  return context;
}
