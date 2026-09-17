import type { ReactNode } from "react";

import { CursorTagIcon } from "../../../assets/CursorTagIcon";
import { GamesPartyLogo } from "../../../assets/GamesPartyLogo";
import { ArrowDownIcon } from "../../../components/ui/icons/ArrowDownIcon";
import { ArrowUpIcon } from "../../../components/ui/icons/ArrowUpIcon";
import { CheckIcon } from "../../../components/ui/icons/CheckIcon";
import { ExitIcon } from "../../../components/ui/icons/ExitIcon";
import { LinkIcon } from "../../../components/ui/icons/LinkIcon";
import { MinusIcon } from "../../../components/ui/icons/MinusIcon";
import { PlusIcon } from "../../../components/ui/icons/PlusIcon";
import { SoundOffIcon } from "../../../components/ui/icons/SoundOffIcon";
import { SoundOnIcon } from "../../../components/ui/icons/SoundOnIcon";
import { ICON_SIZE_SOUND } from "../../../components/ui/icons/iconProps";
import { GallerySection } from "./GallerySection";

const LOGO_SMALL_SIZE = 38;

export function IconsSection() {
  return (
    <GallerySection
      title="Icônes et marques"
      note="Trait 2 px, extrémités arrondies, jamais de remplissage, couleur currentColor."
    >
      <div className="flex flex-wrap items-end gap-6">
        <Sample label="son actif · 22">
          <SoundOnIcon size={ICON_SIZE_SOUND} />
        </Sample>
        <Sample label="son coupé · 22">
          <SoundOffIcon size={ICON_SIZE_SOUND} />
        </Sample>
        <Sample label="lien · 18">
          <LinkIcon />
        </Sample>
        <Sample label="coche · 18">
          <CheckIcon />
        </Sample>
        <Sample label="sortie · 18">
          <ExitIcon />
        </Sample>
        <Sample label="moins · 18">
          <MinusIcon />
        </Sample>
        <Sample label="plus · 18">
          <PlusIcon />
        </Sample>
        <Sample label="flèche haut · 18">
          <ArrowUpIcon />
        </Sample>
        <Sample label="flèche bas · 18">
          <ArrowDownIcon />
        </Sample>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <Sample label="logo · 44">
          <GamesPartyLogo />
        </Sample>
        <Sample label="logo · 38">
          <GamesPartyLogo size={LOGO_SMALL_SIZE} />
        </Sample>
        <Sample label="Cursor Tag · 48">
          <CursorTagIcon />
        </Sample>
        <Sample label="logo complet">
          <span className="flex items-center gap-3">
            <GamesPartyLogo />
            <span className="t-logo">Games Party</span>
          </span>
        </Sample>
      </div>
    </GallerySection>
  );
}

function Sample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="t-small text-ink-secondary">{label}</span>
    </div>
  );
}
