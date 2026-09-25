import { useRef } from "react";

import { useArenaScene, type ArenaScene as Scene } from "../hooks/useArenaScene";

/** A fixed picture of Cursor Tag's arena, as wide as its parent, in 16:9. */
export function ArenaScene({ scene }: { scene: Scene }) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useArenaScene(container, canvas, scene);

  return (
    <div ref={container} className="aspect-video w-full">
      <canvas ref={canvas} className="block rounded-xl" />
    </div>
  );
}
