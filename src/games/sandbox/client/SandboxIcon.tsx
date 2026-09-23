import { ARENA_WALL_RADIUS } from "../../../shared/constants";

/**
 * The 48 px mark of the sandbox's game card (docs/design-system.md, §11.7 and §10). A wall and a
 * cursor: what the game is, and nothing more.
 */
export function SandboxIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      role="img"
      aria-label="Bac à sable"
      className="shrink-0 rounded-md"
    >
      <rect width="48" height="48" rx="16" fill="var(--color-arena)" />
      <rect
        x="10"
        y="14"
        width="28"
        height="6"
        rx={ARENA_WALL_RADIUS / 2}
        fill="var(--color-arena-wall)"
      />
      <circle cx="18" cy="32" r="6" fill="var(--color-player-7)" />
    </svg>
  );
}
