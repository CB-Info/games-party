import { useState } from "react";

import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { ExitIcon } from "../../../components/ui/icons/ExitIcon";

interface LeaveRoomButtonProps {
  /** Pseudo of the player who takes the room over, when you are the host (architecture §5.5). */
  nextHostPseudo: string | null;
  onLeave: () => void;
}

const BASE_MESSAGE =
  "Tu pourras revenir avec le lien, mais ton score de la soirée repartira de zéro.";

/** Leaving always asks first (docs/architecture.md, §5.5 ; design-system §11.17). */
export function LeaveRoomButton({ nextHostPseudo, onLeave }: LeaveRoomButtonProps) {
  const [confirming, setConfirming] = useState(false);

  const message =
    nextHostPseudo === null ? BASE_MESSAGE : `${BASE_MESSAGE} ${nextHostPseudo} deviendra l’hôte.`;

  return (
    <>
      <Button variant="quiet" icon={<ExitIcon />} onClick={() => setConfirming(true)}>
        Quitter la room
      </Button>

      <ConfirmDialog
        open={confirming}
        title="Quitter la room ?"
        message={message}
        cancelLabel="Rester"
        confirmLabel="Quitter"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onLeave();
        }}
      />
    </>
  );
}
