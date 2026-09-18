import { useState } from "react";

import { Button } from "../../../components/ui/Button";
import { ReadyToggleButton } from "../../../components/ui/ReadyToggleButton";
import { SoundButton } from "../../../components/ui/SoundButton";
import { ExitIcon } from "../../../components/ui/icons/ExitIcon";
import { LinkIcon } from "../../../components/ui/icons/LinkIcon";
import { GallerySection } from "./GallerySection";

// The help only exists in the ready state, and only in the lobby (docs/design-system.md, §11.3).
const CANCEL_HINT = "Clique à nouveau pour annuler";

export function ButtonsSection() {
  const [ready, setReady] = useState(false);
  const [readyToo, setReadyToo] = useState(true);
  const [muted, setMuted] = useState(false);

  return (
    <GallerySection
      title="Boutons"
      note="Survol et focus se vérifient à la souris et au clavier : aucun état ne change les dimensions."
    >
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary">Créer une room</Button>
        <Button variant="secondary">Changer</Button>
        <Button variant="soft" icon={<LinkIcon />}>
          Copier le lien
        </Button>
        <Button variant="danger">Quitter</Button>
        <Button variant="quiet" icon={<ExitIcon />}>
          Quitter la room
        </Button>
      </div>

      <span className="t-small text-ink-secondary">Désactivés</span>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" disabled>
          Créer une room
        </Button>
        <Button variant="secondary" disabled>
          Changer
        </Button>
        <Button variant="soft" disabled icon={<LinkIcon />}>
          Copier le lien
        </Button>
        <Button variant="danger" disabled>
          Quitter
        </Button>
        <Button variant="quiet" disabled icon={<ExitIcon />}>
          Quitter la room
        </Button>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex flex-col items-center gap-2">
          <ReadyToggleButton ready={ready} onToggle={() => setReady(!ready)} />
          {ready ? <span className="t-small text-ink-secondary">{CANCEL_HINT}</span> : null}
        </div>
        <div className="flex flex-col items-center gap-2">
          <ReadyToggleButton ready={readyToo} onToggle={() => setReadyToo(!readyToo)} />
          {readyToo ? <span className="t-small text-ink-secondary">{CANCEL_HINT}</span> : null}
        </div>
        <div className="flex flex-col items-center gap-2">
          <SoundButton muted={muted} onToggle={() => setMuted(!muted)} />
          <span className="t-small text-ink-secondary">bouton du son · 48</span>
        </div>
      </div>
    </GallerySection>
  );
}
