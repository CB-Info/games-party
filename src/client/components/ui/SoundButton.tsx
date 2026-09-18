import { SoundOffIcon } from "./icons/SoundOffIcon";
import { SoundOnIcon } from "./icons/SoundOnIcon";
import { ICON_SIZE_SOUND } from "./icons/iconProps";

interface SoundButtonProps {
  muted: boolean;
  onToggle: () => void;
}

/** Round 48 px button of the header (docs/design-system.md, §11.2). */
export function SoundButton({ muted, onToggle }: SoundButtonProps) {
  return (
    <button
      type="button"
      aria-label={muted ? "Activer le son" : "Couper le son"}
      aria-pressed={muted}
      onClick={onToggle}
      className="focus-ring inline-flex size-12 items-center justify-center rounded-pill border border-line bg-surface text-ink transition-[background-color,border-color] duration-fast ease-fast hover:border-line-strong"
    >
      {muted ? <SoundOffIcon size={ICON_SIZE_SOUND} /> : <SoundOnIcon size={ICON_SIZE_SOUND} />}
    </button>
  );
}
