/** Icon size inside buttons and pills, in pixels (docs/design-system.md, §10). */
export const ICON_SIZE = 18;

/** Icon size of the sound button, in pixels (docs/design-system.md, §10). */
export const ICON_SIZE_SOUND = 22;

export interface IconProps {
  /** Rendered size in pixels. Defaults to ICON_SIZE. */
  size?: number;
  className?: string;
}
