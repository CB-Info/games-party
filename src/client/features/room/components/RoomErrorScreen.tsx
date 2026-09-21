import { ROOM_CAPACITY } from "../../../../shared/constants";
import { Button } from "../../../components/ui/Button";
import type { RoomErrorKind } from "../errorMessages";

interface RoomErrorScreenProps {
  kind: RoomErrorKind;
  hostPseudo: string | null;
  onCreateRoom: () => void;
  onRetry: () => void;
}

/** What each refusal says (docs/maquettes/5.1, docs/design-system.md, §13). */
function contentOf(kind: RoomErrorKind, hostPseudo: string | null) {
  if (kind === "full") {
    const owner = hostPseudo ?? "l’hôte";
    return {
      title: "La room est pleine.",
      body: `Dix joueurs, c’est le maximum. Demande à ${owner} de libérer une place, ou lance ta propre room et envoie le lien à tes potes.`,
      badge: `${ROOM_CAPACITY} / ${ROOM_CAPACITY}`,
    };
  }

  if (kind === "serverFull") {
    return {
      title: "Toutes les rooms sont prises.",
      body: "Le serveur tourne à plein régime. Laisse passer une minute et retente : il s’en libère tout le temps.",
      badge: "Serveur complet",
    };
  }

  return {
    title: "Cette room n’existe pas ou a expiré.",
    body: "Le lien est peut-être trop vieux, ou la room s’est vidée. Lance la tienne, elle prend deux secondes.",
    badge: null,
  };
}

/** Replaces the left column of the invitation screen (docs/design-system.md, §13). */
export function RoomErrorScreen({ kind, hostPseudo, onCreateRoom, onRetry }: RoomErrorScreenProps) {
  const { title, body, badge } = contentOf(kind, hostPseudo);

  return (
    <div className="flex flex-col gap-6">
      {badge === null ? null : (
        <span className="inline-flex self-start items-center gap-2 rounded-pill bg-danger-soft px-3 py-2 t-micro text-danger">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-pill bg-danger" />
          {badge}
        </span>
      )}

      <h1 className="t-display">{title}</h1>
      <p className="t-body-lg text-ink-secondary">{body}</p>

      <div className="flex gap-4">
        <Button onClick={onCreateRoom}>Créer ma room</Button>
        {kind === "notFound" ? null : (
          <Button variant="secondary" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    </div>
  );
}
