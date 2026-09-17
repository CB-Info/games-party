import { ICON_SIZE, type IconProps } from "./iconProps";

export function SoundOffIcon({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 9.5h3L11 6v12l-4-3.5H4z" />
      <path d="M16 10l4 4" />
      <path d="M20 10l-4 4" />
    </svg>
  );
}
