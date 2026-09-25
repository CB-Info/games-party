import { useRef } from "react";

import { useArenaScene, type ArenaScene as Scene } from "../hooks/useArenaScene";

interface ArenaSceneProps {
  scene: Scene;
  /** What the picture shows, for a screen reader; without it, the canvas is left unlabelled. */
  label?: string;
}

/** A fixed picture of Cursor Tag's arena, as wide as its parent, in 16:9. */
export function ArenaScene({ scene, label }: ArenaSceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useArenaScene(container, canvas, scene);

  return (
    <div ref={container} className="aspect-video w-full">
      <canvas
        ref={canvas}
        className="block rounded-xl"
        {...(label === undefined ? {} : { role: "img", "aria-label": label })}
      />
    </div>
  );
}
