import { useEffect, useRef, useState, type RefObject } from "react";

import { fitArena, type ArenaBox } from "../../../engine/arenaScale";
import { sizeCanvas } from "../../../engine/canvasSurface";

const EMPTY: ArenaBox = { width: 0, height: 0, scale: 0 };

/**
 * Sizes the arena to its container and keeps the canvas crisp (docs/design-system.md, §13 and
 * §12). The box is React state — it changes when the window is resized, not every frame — while
 * `scaleRef` is what the input conversion reads, so that a resize never forces a re-render to be
 * taken into account.
 */
export function useArenaSurface(
  container: RefObject<HTMLElement | null>,
  canvas: RefObject<HTMLCanvasElement | null>,
): { box: ArenaBox; scaleRef: RefObject<number> } {
  const [box, setBox] = useState<ArenaBox>(EMPTY);
  const scaleRef = useRef(0);

  useEffect(() => {
    const element = container.current;
    if (element === null) {
      return;
    }

    const measure = (): void => {
      const next = fitArena(element.clientWidth, element.clientHeight);
      scaleRef.current = next.scale;
      setBox(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [container]);

  useEffect(() => {
    const element = canvas.current;
    if (element !== null && box.width > 0) {
      sizeCanvas(element, box.width, box.height, window.devicePixelRatio);
    }
  }, [canvas, box]);

  return { box, scaleRef };
}
