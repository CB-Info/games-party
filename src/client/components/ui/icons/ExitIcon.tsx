import { ICON_SIZE, type IconProps } from "./iconProps";

export function ExitIcon({ size = ICON_SIZE, className }: IconProps) {
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
      <path d="M14.5 4.5H6.8A1.8 1.8 0 0 0 5 6.3v11.4a1.8 1.8 0 0 0 1.8 1.8h7.7" />
      <path d="M14.8 12H21" />
      <path d="M18.2 8.8L21 12l-2.8 3.2" />
    </svg>
  );
}
