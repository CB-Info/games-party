/** Tile side in pixels inside a game card (docs/design-system.md, §11.7). */
const GAME_ICON_SIZE = 48;

interface CursorTagIconProps {
  /** Rendered side in pixels. Defaults to GAME_ICON_SIZE. */
  size?: number;
  className?: string;
}

/**
 * Cursor Tag's mark: the round head with ears. Redrawn from the box coordinates of
 * docs/design-system.md, §10. The head is drawn last so that it covers the base of the ears.
 */
export function CursorTagIcon({ size = GAME_ICON_SIZE, className }: CursorTagIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="44" height="44" rx="16" fill="var(--color-cursor-tag)" />
      <rect
        x="12"
        y="11"
        width="7"
        height="7"
        rx="2"
        transform="rotate(45 15.5 14.5)"
        fill="var(--color-on-accent)"
      />
      <rect
        x="25"
        y="11"
        width="7"
        height="7"
        rx="2"
        transform="rotate(45 28.5 14.5)"
        fill="var(--color-on-accent)"
      />
      <circle cx="22" cy="25" r="9" fill="var(--color-on-accent)" />
    </svg>
  );
}
