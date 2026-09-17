import { ICON_SIZE, type IconProps } from "./iconProps";

export function SoundOnIcon({ size = ICON_SIZE, className }: IconProps) {
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
      <path d="M15 9.6a3.6 3.6 0 0 1 0 4.8" />
      <path d="M17.6 7.2a7 7 0 0 1 0 9.6" />
    </svg>
  );
}
