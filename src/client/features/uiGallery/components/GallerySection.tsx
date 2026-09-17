import type { ReactNode } from "react";

interface GallerySectionProps {
  title: string;
  /** What to check by hand in this section. */
  note?: string;
  children: ReactNode;
}

/** Common frame of a demonstration section, echoing the board of docs/maquettes/. */
export function GallerySection({ title, note, children }: GallerySectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-1">
      <div className="flex flex-col gap-1">
        <h2 className="t-title-2">{title}</h2>
        {note === undefined ? null : <p className="t-small text-ink-secondary">{note}</p>}
      </div>
      {children}
    </section>
  );
}
