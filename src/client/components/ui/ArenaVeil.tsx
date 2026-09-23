import type { ReactNode } from "react";

/**
 * The only way to lay content over the arena (docs/design-system.md, §11.19). It covers the arena
 * and nothing else — the header, and so the sound button, stay reachable — and the content sits
 * centred above it without being darkened. The game keeps running behind: the veil is a sibling
 * layer, and the render loop never learns it is there.
 *
 * The parent must be positioned. Fading rather than sliding: §9 allows only `transform` and
 * `opacity`, and a veil that slid in would fight the arena it covers.
 */
export function ArenaVeil({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 rounded-xl bg-arena-veil px-12 text-center animate-appear">
      {children}
    </div>
  );
}
