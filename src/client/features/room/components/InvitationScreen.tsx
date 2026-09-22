import type { RoomPreview } from "../../../../shared/types";
import { DemoArena } from "../../demo/components/DemoArena";
import { HeroBadge, HeroBadgeLive, HeroCard, HeroIntro } from "../../home/components/HeroCard";
import { PseudoForm } from "../../home/components/PseudoForm";
import type { RoomErrorKind } from "../errorMessages";
import { RoomErrorScreen } from "./RoomErrorScreen";
import { RoomPreviewPanel } from "./RoomPreviewPanel";

interface InvitationScreenProps {
  preview: RoomPreview | null;
  /** Set when the room refused us outright; it replaces the whole left column (§13). */
  errorKind: RoomErrorKind | null;
  pseudo: string;
  onPseudoChange: (pseudo: string) => void;
  onJoin: () => void;
  onCreateRoom: () => void;
  onRetry: () => void;
  /** Shown under the field, for instance a pseudo already taken (§13). */
  fieldError?: string;
  /** A pseudo the room refused: its owner is pointed at in the preview (§11.10). */
  takenPseudo?: string;
  busy: boolean;
}

/** Arriving by a room link (docs/maquettes/5.1, docs/architecture.md, §2 and §5.7). */
export function InvitationScreen({
  preview,
  errorKind,
  pseudo,
  onPseudoChange,
  onJoin,
  onCreateRoom,
  onRetry,
  fieldError,
  takenPseudo,
  busy,
}: InvitationScreenProps) {
  const host = preview?.hostPseudo ?? "quelqu’un";
  const inGame = preview?.status === "in_game";

  const aside =
    preview === null ? (
      <DemoArena />
    ) : (
      <RoomPreviewPanel preview={preview} {...(takenPseudo === undefined ? {} : { takenPseudo })} />
    );

  if (errorKind !== null) {
    return (
      <HeroCard
        left={
          <RoomErrorScreen
            kind={errorKind}
            hostPseudo={preview?.hostPseudo ?? null}
            onCreateRoom={onCreateRoom}
            onRetry={onRetry}
          />
        }
        aside={aside}
      />
    );
  }

  return (
    <HeroCard
      left={
        <>
          <HeroIntro
            badge={
              inGame ? (
                <HeroBadgeLive>Partie en cours</HeroBadgeLive>
              ) : (
                <HeroBadge>Invitation</HeroBadge>
              )
            }
            title={inGame ? `Ça joue déjà chez ${host}.` : `La room de ${host} t’attend.`}
            intro={
              inGame
                ? "Tu entres en spectateur : tu regardes la fin de la partie, et tu joues à la suivante. Choisis quand même ton pseudo maintenant."
                : "Choisis un pseudo, tu récupères ta couleur juste après."
            }
          />
          <PseudoForm
            pseudo={pseudo}
            onPseudoChange={onPseudoChange}
            submitLabel={inGame ? "Regarder" : "Rejoindre"}
            onSubmit={onJoin}
            hint={
              inGame
                ? "Tu joueras à la prochaine partie, sans rien avoir à refaire."
                : "2 à 16 caractères. Tu récupères ta couleur dans le lobby."
            }
            busy={busy}
            {...(fieldError === undefined ? {} : { error: fieldError })}
          />
        </>
      }
      aside={aside}
    />
  );
}
