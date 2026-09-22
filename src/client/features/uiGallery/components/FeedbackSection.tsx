import { useState } from "react";

import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Notification } from "../../../components/ui/Notification";
import { NoMouseMessage } from "../../appShell/components/NoMouseMessage";
import { ReplacedMessage } from "../../appShell/components/ReplacedMessage";
import { GallerySection } from "./GallerySection";

export function FeedbackSection() {
  const [confirming, setConfirming] = useState(false);

  return (
    <GallerySection
      title="Notifications, confirmation et messages d’écran"
      note="La boîte de confirmation se ferme aussi avec Échap ou par un clic sur le voile. Les deux derniers messages remplacent tout le contenu de la page."
    >
      <div className="flex flex-col items-center gap-3">
        <Notification tone="success">Mika a changé de jeu, reclique sur Prêt.</Notification>
        <Notification tone="warning">Connexion perdue, reconnexion…</Notification>
        <Notification tone="error">La room est pleine : 10 joueurs, c’est le max.</Notification>
      </div>

      <div>
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Ouvrir la confirmation
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Quitter la room ?"
        message="Tu pourras revenir avec le lien, mais ton score de la soirée repartira de zéro."
        cancelLabel="Rester"
        confirmLabel="Quitter"
        onCancel={() => setConfirming(false)}
        onConfirm={() => setConfirming(false)}
      />

      <div className="flex flex-col gap-3 rounded-md border border-line bg-page p-6">
        <NoMouseMessage />
        <ReplacedMessage />
      </div>
    </GallerySection>
  );
}
