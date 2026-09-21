import type { PlayerColorId } from "../../../shared/types";

/**
 * The ten player colours, written as literal class names. Tailwind reads the source text, so a
 * computed class would produce nothing, and a `style` attribute would break the page's CSP
 * (docs/design-system.md, §4.2).
 */
const SWATCH_CLASSES: Record<PlayerColorId, string> = {
  c1: "bg-player-1",
  c2: "bg-player-2",
  c3: "bg-player-3",
  c4: "bg-player-4",
  c5: "bg-player-5",
  c6: "bg-player-6",
  c7: "bg-player-7",
  c8: "bg-player-8",
  c9: "bg-player-9",
  c10: "bg-player-10",
};

/** Row swatch, 22 px, and palette swatch, 38 px (docs/design-system.md, §11.10 and §11.11). */
const SIZES = {
  row: "size-[22px] rounded-pill",
  palette: "size-[38px] rounded-sm",
} as const;

interface PlayerSwatchProps {
  color: PlayerColorId;
  size?: keyof typeof SIZES;
  /** Dims the swatch of a disconnected player (§11.10). */
  dimmed?: boolean;
  className?: string;
}

/** A player's colour. On a light surface it carries the 1 px inner edge of §3. */
export function PlayerSwatch({
  color,
  size = "row",
  dimmed = false,
  className = "",
}: PlayerSwatchProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 shadow-[inset_0_0_0_1px_var(--color-swatch-edge)] ${SIZES[size]} ${SWATCH_CLASSES[color]} ${dimmed ? "opacity-35" : ""} ${className}`}
    />
  );
}

/** The empty dotted swatch of the "Il manque un joueur" row (docs/design-system.md, §11.10). */
export function EmptySwatch() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[22px] shrink-0 rounded-pill border border-dashed border-line-strong"
    />
  );
}
