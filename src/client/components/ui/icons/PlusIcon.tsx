import { ICON_SIZE, type IconProps } from "./iconProps";

export function PlusIcon({ size = ICON_SIZE, className }: IconProps) {
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
      <path d="M6 12h12" />
      <path d="M12 6v12" />
    </svg>
  );
}
