import { ICON_SIZE, type IconProps } from "./iconProps";

export function LinkIcon({ size = ICON_SIZE, className }: IconProps) {
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
      <path d="M10.4 13.6a3.6 3.6 0 0 1 0-5.1l2.5-2.5a3.6 3.6 0 0 1 5.1 5.1l-1.3 1.3" />
      <path d="M13.6 10.4a3.6 3.6 0 0 1 0 5.1l-2.5 2.5a3.6 3.6 0 0 1-5.1-5.1l1.3-1.3" />
    </svg>
  );
}
