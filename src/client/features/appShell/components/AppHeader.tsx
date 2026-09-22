import { Link } from "react-router";

import { GamesPartyLogo } from "../../../assets/GamesPartyLogo";
import { SoundButton } from "../../../components/ui/SoundButton";

const LOGO_SIZE = 38;
const LOGO_SIZE_WIDE = 44;

interface AppHeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
}

/** Logo on the left, sound button on the right, on every screen (docs/design-system.md, §13). */
export function AppHeader({ soundEnabled, onToggleSound }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-12 py-6 wide:px-14 wide:py-8">
      <Link to="/" className="flex items-center gap-3 text-ink no-underline hover:no-underline">
        <GamesPartyLogo size={LOGO_SIZE} className="wide:hidden" />
        <GamesPartyLogo size={LOGO_SIZE_WIDE} className="hidden wide:block" />
        <span className="t-logo">Games Party</span>
      </Link>

      <SoundButton muted={!soundEnabled} onToggle={onToggleSound} />
    </header>
  );
}
