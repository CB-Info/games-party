/** Tile side in pixels, above the wide breakpoint (docs/design-system.md, §10). */
const LOGO_SIZE = 44;

interface GamesPartyLogoProps {
  /** Rendered side in pixels. Defaults to LOGO_SIZE. */
  size?: number;
  className?: string;
}

/**
 * The "bande de potes" mark: three grouped cursors on an Accent tile. Redrawn from the box
 * coordinates of docs/design-system.md, §10 — the maquettes hold HTML blocks, not an SVG.
 */
export function GamesPartyLogo({ size = LOGO_SIZE, className }: GamesPartyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="44" height="44" rx="16" fill="var(--color-accent)" />
      <circle cx="14" cy="14" r="5" fill="var(--color-on-accent)" />
      <circle cx="31" cy="19" r="5" fill="var(--color-on-accent)" fillOpacity="0.62" />
      <circle cx="21" cy="31" r="5" fill="var(--color-on-accent)" fillOpacity="0.82" />
    </svg>
  );
}
