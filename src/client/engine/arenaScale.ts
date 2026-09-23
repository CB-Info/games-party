import { ARENA_HEIGHT, ARENA_WIDTH } from "../../shared/constants";

export interface ArenaBox {
  /** Displayed size, in CSS pixels. */
  width: number;
  height: number;
  /**
   * Displayed width divided by `ARENA_WIDTH` (docs/architecture.md, §6.4). In **CSS pixels**: it
   * is the divisor applied to `movementX/Y`, which the browser reports in CSS pixels, and the
   * sensitivity is the same for everyone whatever the screen (§6.5).
   */
  scale: number;
}

export interface BackingSize {
  /** Size of the canvas buffer, in device pixels. */
  width: number;
  height: number;
  /** Ratio to hand to `setTransform`, so that one drawing unit stays one CSS pixel. */
  ratio: number;
}

/** Largest device ratio honoured. Beyond it the buffer grows for nothing. */
const MAX_DEVICE_RATIO = 3;

/**
 * The largest 16:9 arena that fits in a box, keeping its ratio (docs/architecture.md, §6.4). The
 * caller centres it; the engine only says how big it may be.
 */
export function fitArena(containerWidth: number, containerHeight: number): ArenaBox {
  const usableWidth = Math.max(0, containerWidth);
  const usableHeight = Math.max(0, containerHeight);
  const width = Math.min(usableWidth, (usableHeight * ARENA_WIDTH) / ARENA_HEIGHT);

  return {
    width,
    height: (width * ARENA_HEIGHT) / ARENA_WIDTH,
    scale: width / ARENA_WIDTH,
  };
}

/**
 * Size of the canvas buffer for a displayed size. A canvas drawn at CSS size on a dense screen is
 * blurry: the buffer must hold device pixels, and the context is scaled once so that the drawing
 * code keeps reasoning in CSS pixels. The ratio never enters the input conversion (§6.5).
 */
export function backingSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): BackingSize {
  const ratio = Math.min(MAX_DEVICE_RATIO, Math.max(1, devicePixelRatio));

  return {
    width: Math.round(cssWidth * ratio),
    height: Math.round(cssHeight * ratio),
    ratio,
  };
}
