import { useState } from "react";

import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Notification } from "../../../components/ui/Notification";
import { GallerySection } from "./GallerySection";

export function FeedbackSection() {
  const [confirming, setConfirming] = useState(false);

  return (
    <GallerySection
      title="Notifications et confirmation"
      note="La boîte de confirmation se ferme aussi avec Échap ou par un clic sur le voile."
    >
      <div className="flex flex-col items-center gap-3">
        <Notification tone="success">Lien copié, envoie-le à tes potes !</Notification>
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
    </GallerySection>
  );
}
